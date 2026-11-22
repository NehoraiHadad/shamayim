import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { cropSectorOf } from '../../src/data/landmarks/cropAreas'
import { evidenceOf, industrialNamed } from '../../src/data/landmarks/industrial'
import { parseOverpass } from '../../src/data/landmarks/overpass'
import type { CropRow, EvidenceCell, IsraelLandmarkIndex, Row } from '../../src/data/landmarks/israelData'
import { score } from '../../src/data/landmarks/rank'
import type { Landmark, MarkKind } from '../../src/data/landmarks/types'

type Position = [number, number]
type Geometry = { type: string; coordinates: unknown }
interface Feature { id?: string | number; geometry?: Geometry; properties?: Record<string, unknown> }
export type LandmarkIndex = IsraelLandmarkIndex
interface BuildOptions { outputDir: string; generatedAt?: string; bbox?: LandmarkIndex['bbox']; maxCellBytes?: number }

export const ISRAEL_EXTRACT_BBOX: LandmarkIndex['bbox'] = [29.45, 34.17, 33.34, 35.9]
const SOURCE = 'OpenStreetMap via Geofabrik (ODbL)' as const

function positions(value: unknown, found: Position[] = []): Position[] {
  if (!Array.isArray(value)) return found
  if (typeof value[0] === 'number' && typeof value[1] === 'number') found.push(value as Position)
  else value.forEach((part) => positions(part, found))
  return found
}

function center(geometry?: Geometry): { lat: number; lon: number } | null {
  const points = positions(geometry?.coordinates)
  if (!points.length) return null
  if (geometry?.type === 'Point') return { lon: points[0][0], lat: points[0][1] }
  const lons = points.map(([lon]) => lon)
  const lats = points.map(([, lat]) => lat)
  return { lon: (Math.min(...lons) + Math.max(...lons)) / 2, lat: (Math.min(...lats) + Math.max(...lats)) / 2 }
}

function numericId(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number') return value
  const text = value ?? String(fallback)
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

export function parseGeoJsonSequence(input: string, includeAreas = false): Landmark[] {
  const records = input.includes('\x1e') ? input.split('\x1e') : input.split(/\r?\n/)
  const elements = records.flatMap((record, index) => {
    const text = record.trim()
    if (!text) return []
    const feature = JSON.parse(text) as Feature
    const point = center(feature.geometry)
    if (!point) return []
    const properties = feature.properties ?? {}
    const tags = Object.fromEntries(Object.entries(properties)
      .filter(([key, value]) => !key.startsWith('@') && typeof value === 'string'))
    const rawId = feature.id ?? properties['@id'] as string | number | undefined
    return [{ id: numericId(rawId, index), center: point, tags, areaGeometry: includeAreas ? feature.geometry : undefined }]
  })
  // An industrial structure is a landmark only by its own data: a name that is a name, then fame or size.
  return parseOverpass({ elements }, { name: (mark, tags) => industrialNamed(mark, evidenceOf(tags)) })
}

export function row(mark: Landmark): Row {
  const base: [MarkKind, number, number, number] = [mark.kind, Number(mark.lat.toFixed(5)),
    Number(mark.lon.toFixed(5)), Number(mark.heightM.toFixed(2))]
  if (mark.fame) return [...base, mark.nameHe ?? '', mark.fame]
  return mark.nameHe ? [...base, mark.nameHe] : base
}

function compact(marks: Landmark[], maxBytes: number): EvidenceCell {
  const ranked = [...marks].sort((a, b) => score(b, 0, 0, 1) - score(a, 0, 0, 1))
  const pack = (): EvidenceCell => ({ heights: 'evidence', rows: ranked.map(row) })
  while (ranked.length && Buffer.byteLength(JSON.stringify(pack())) > maxBytes) ranked.pop()
  return pack()
}

export async function buildDataset(input: string, options: BuildOptions) {
  const marks = parseGeoJsonSequence(input)
  const grouped = new Map<string, Landmark[]>()
  for (const mark of marks) {
    const cell = `${Math.floor(mark.lat * 10)}_${Math.floor(mark.lon * 10)}`
    grouped.set(cell, [...(grouped.get(cell) ?? []), mark])
  }
  const cells = [...grouped.keys()].sort()
  await rm(options.outputDir, { recursive: true, force: true })
  await mkdir(options.outputDir, { recursive: true })
  const cropBytes = await writeCropSectors(input, options.outputDir)
  let bytes = 0
  for (const cell of cells) {
    const contents = JSON.stringify(compact(grouped.get(cell)!, options.maxCellBytes ?? 150_000))
    bytes += Buffer.byteLength(contents)
    await writeFile(`${options.outputDir}/${cell}.json`, contents)
  }
  const index: LandmarkIndex = { generatedAt: options.generatedAt ?? new Date().toISOString(), source: SOURCE,
    bbox: options.bbox ?? ISRAEL_EXTRACT_BBOX, cells }
  const indexJson = JSON.stringify(index)
  bytes += Buffer.byteLength(indexJson)
  await writeFile(`${options.outputDir}/index.json`, indexJson)
  return { index, marks: marks.length, bytes: bytes + cropBytes }
}

/** Keep area evidence independently of the size-limited landmark tiles and their point deduplication. */
export async function writeCropSectors(input: string, outputDir: string): Promise<number> {
  const sectors = new Map<string, CropRow[]>()
  for (const { lat, lon, cropArea } of parseGeoJsonSequence(input, true)) {
    if (!cropArea) continue
    // Same 0.5° sectors as the browser's crop loader. Six decimal places encode about 0.11 m at the equator.
    const sector = cropSectorOf(lat, lon)
    const rows = sectors.get(sector) ?? []
    if (!sectors.has(sector)) sectors.set(sector, rows)
    const round = (value: number) => Math.round(value * 1e6) / 1e6
    const polygons = cropArea.polygons.map((polygon) =>
      polygon.map((ring) => ring.map(([x, y]) => [round(x), round(y)] as const)))
    rows.push([lat, lon, { ...cropArea, polygons }])
  }
  await mkdir(`${outputDir}/crops`, { recursive: true })
  let bytes = 0
  for (const [sector, rows] of [...sectors].sort(([a], [b]) => a.localeCompare(b))) {
    const json = JSON.stringify(rows)
    bytes += Buffer.byteLength(json)
    await writeFile(`${outputDir}/crops/${sector}.json`, json)
  }
  return bytes
}

async function stdin() {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    out: { type: 'string', default: 'public/data/landmarks/il' },
    'generated-at': { type: 'string' },
    'crops-only': { type: 'boolean' },
  } })
  const input = positionals[0] ? await readFile(positionals[0], 'utf8') : await stdin()
  if (values['crops-only']) {
    console.log(`Built crop sectors (${await writeCropSectors(input, values.out!)} bytes).`)
    return
  }
  const result = await buildDataset(input, { outputDir: values.out!, generatedAt: values['generated-at'] })
  console.log(`Built ${result.marks} landmarks in ${result.index.cells.length} cells (${result.bytes} bytes).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()

import type { Place } from '../../config/place'
import type { Fame, Landmark, MarkKind } from './types'
import { HALL_M, LEGACY_DEFAULTS } from './worship'

/** kind, lat, lon, height, name ('' when it has none but is famous), fame (`fame.ts`). */
export type Row = [MarkKind, number, number, number, string?, Fame?]
export interface IsraelLandmarkIndex {
  generatedAt: string
  source: 'OpenStreetMap via Geofabrik (ODbL)'
  bbox: [number, number, number, number]
  cells: string[]
  heights?: 'evidence'
}

const ROOT = `${import.meta.env.BASE_URL}data/landmarks/il`
let indexPromise: Promise<IsraelLandmarkIndex | null> | null = null

function box(place: Place, eastKm: number, northKm: number) {
  const lat = northKm / 111.32
  const lon = eastKm / (111.32 * Math.cos(place.lat * Math.PI / 180))
  return [place.lat - lat, place.lon - lon, place.lat + lat, place.lon + lon] as const
}

function cellsForBox(bounds: readonly number[]) {
  const cells: string[] = []
  for (let lat = Math.floor(bounds[0] * 10); lat <= Math.floor(bounds[2] * 10); lat++) {
    for (let lon = Math.floor(bounds[1] * 10); lon <= Math.floor(bounds[3] * 10); lon++) cells.push(`${lat}_${lon}`)
  }
  return cells
}

export function cellsForStrip(place: Place): string[] {
  return [...new Set([...cellsForBox(box(place, 12, 1.5)), ...cellsForBox(box(place, 30, 3))])].sort()
}

export function inCoverage(index: IsraelLandmarkIndex, place: Place): boolean {
  const [south, west, north, east] = index.bbox
  return place.lat >= south && place.lat <= north && place.lon >= west && place.lon <= east
}

async function getIndex(): Promise<IsraelLandmarkIndex | null> {
  indexPromise ??= fetch(`${ROOT}/index.json`).then(async (response) => {
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Israel landmark index HTTP ${response.status}`)
    return await response.json() as IsraelLandmarkIndex
  })
  return await indexPromise
}

async function loadCell(cell: string, signal: AbortSignal): Promise<Row[]> {
  const response = await fetch(`${ROOT}/${cell}.json`, { signal })
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Israel landmark cell HTTP ${response.status}`)
  return await response.json() as Row[]
}

export async function loadIsrael(place: Place, signal: AbortSignal): Promise<Landmark[] | null> {
  const index = await getIndex()
  if (!index || !inCoverage(index, place)) return null
  const cells = cellsForStrip(place).filter((cell) => index.cells.includes(cell))
  const rows = (await Promise.all(cells.map((cell) => loadCell(cell, signal)))).flat()
  return rows.map(([kind, lat, lon, heightM, nameHe, fame]) => ({ id: `il-${kind}-${lat}-${lon}`,
    kind, lat, lon,
    // The legacy build gave every such row its default, so that height is no evidence of a tower.
    heightM: index.heights !== 'evidence' && heightM === LEGACY_DEFAULTS[kind] ? HALL_M : heightM,
    ...(nameHe ? { nameHe } : {}), source: 'osm', ...(fame ? { fame } : {}) }))
}

export function resetIsraelDataForTests() { indexPromise = null }

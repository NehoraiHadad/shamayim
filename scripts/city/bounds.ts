// Builds the places' own boundaries for the outside view's frame (src/data/city/bounds.ts, CANVAS-SCENE-PLAN.md C5
// item 6) from OSM's administrative boundaries in the Geofabrik extract the city data is built from:
//
//   osmium tags-filter israel-and-palestine-latest.osm.pbf r/boundary=administrative -o admin.osm.pbf
//   osmium export admin.osm.pbf -f geojsonseq --geometry-types=polygon -o admin.geojsonseq
//   npx tsx scripts/city/bounds.ts admin.geojsonseq [--cities public/data/city/il] [--out public/data/city/bounds.json]
//
// The place points are the city data's own (`p` of each cell). A place's boundary is the largest polygon holding its
// point and no rival point (another place of its own rank or higher; a town ranks with a city), simplified to ~40 m.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { encodeRing, inRings, type BoundsFile, type BoundsPoint } from '../../src/data/city/bounds'
import type { CityCell } from '../../src/data/city/types'

/** OSM admin levels a place's own boundary can have: 6 and finer (municipal and local, their parts). */
const MIN_LEVEL = 6
/** Rings simplified to this (m): finer than a built square of the city raster (~118 × 232 m). */
const SIMPLIFY_M = 40

type Ring = [lat: number, lon: number][]
interface Area { level: number; name?: string; rings: Ring[]; box: [number, number, number, number]; size: number }

/** Douglas–Peucker in degrees (≈ m / 111 320; longitude scaled by the latitude's cosine). */
export function simplify(ring: Ring, toleranceM: number): Ring {
  if (ring.length <= 4) return ring
  // A closed ring: split it at its point farthest from the first, and simplify each half.
  const [y0, x0] = ring[0]
  let split = 1
  ring.forEach(([y, x], i) => { if (Math.hypot(y - y0, x - x0) > Math.hypot(ring[split][0] - y0, ring[split][1] - x0)) split = i })
  if (split > 0 && split < ring.length - 1) {
    return [...line(ring.slice(0, split + 1), toleranceM).slice(0, -1), ...line(ring.slice(split), toleranceM)]
  }
  return line(ring, toleranceM)
}

function line(ring: Ring, toleranceM: number): Ring {
  if (ring.length <= 2) return ring
  const cos = Math.cos(ring[0][0] * Math.PI / 180)
  const tol = toleranceM / 111_320
  const keep = new Uint8Array(ring.length)
  keep[0] = keep[ring.length - 1] = 1
  const stack: [number, number][] = [[0, ring.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ay, ax] = ring[a], [by, bx] = ring[b]
    const dx = (bx - ax) * cos, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12
    let worst = -1, far = 0
    for (let i = a + 1; i < b; i++) {
      const px = (ring[i][1] - ax) * cos, py = ring[i][0] - ay
      const d = Math.abs(px * dy - py * dx) / len
      if (d > far) { far = d; worst = i }
    }
    if (worst >= 0 && far > tol) {
      keep[worst] = 1
      stack.push([a, worst], [worst, b])
    }
  }
  return ring.filter((_, i) => keep[i])
}

function ringsOf(geometry: { type: string; coordinates: unknown }): Ring[] {
  const polygons = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as [number, number][][][]
  return polygons.flat().map((ring) => ring.map(([lon, lat]): [number, number] => [lat, lon]))
}

function areaOf(rings: Ring[]) {
  let total = 0
  for (const ring of rings) {
    let twice = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) twice += (ring[j][1] + ring[i][1]) * (ring[j][0] - ring[i][0])
    total += Math.abs(twice) / 2 * (ring.length ? 1 : 0)
  }
  return total
}

export function parseAreas(text: string): Area[] {
  const areas: Area[] = []
  // oxlint-disable-next-line no-control-regex -- the record separator of a GeoJSON text sequence
  for (const record of text.split(/\x1e|\n/)) {
    const line = record.trim()
    if (!line) continue
    const feature = JSON.parse(line) as { geometry?: { type: string; coordinates: unknown }; properties?: Record<string, unknown> }
    const props = feature.properties ?? {}
    const level = Number(props.admin_level)
    // National, district and subdistrict levels (2–5) are never one place's own.
    if (!feature.geometry || !Number.isFinite(level) || level < MIN_LEVEL) continue
    const rings = ringsOf(feature.geometry).filter((ring) => ring.length >= 4)
    if (!rings.length) continue
    const lats = rings.flat().map(([lat]) => lat), lons = rings.flat().map(([, lon]) => lon)
    const name = typeof props['name:he'] === 'string' ? props['name:he'] : typeof props.name === 'string' ? props.name : undefined
    areas.push({ level, name, rings, box: [Math.min(...lats), Math.min(...lons), Math.max(...lats), Math.max(...lons)],
      size: areaOf(rings) })
  }
  return areas
}

const holds = (area: Area, [lat, lon]: BoundsPoint) =>
  lat >= area.box[0] && lat <= area.box[2] && lon >= area.box[1] && lon <= area.box[3] && inRings(area.rings, lat, lon)

/** A place's boundary: the largest area holding its point and no rival point. */
export function boundaryOf(point: BoundsPoint, areas: readonly Area[], points: readonly BoundsPoint[]): Area | null {
  const rank = Math.max(point[2], 1)
  let best: Area | null = null
  for (const area of areas) {
    if (best && area.size <= best.size) continue
    if (!holds(area, point)) continue
    if (points.some((other) => other !== point && other[2] <= rank && holds(area, other))) continue
    best = area
  }
  return best
}

export async function buildBounds(adminPath: string, citiesDir: string, generatedAt = new Date().toISOString()): Promise<BoundsFile> {
  const areas = parseAreas(await readFile(adminPath, 'utf8'))
  const points: BoundsPoint[] = []
  for (const file of (await readdir(citiesDir)).filter((name) => /^\d+_\d+\.json$/.test(name)).sort()) {
    const cell = JSON.parse(await readFile(join(citiesDir, file), 'utf8')) as CityCell
    if (cell.v === 2) for (const [lat, lon, kind, , reach] of cell.p) points.push([lat, lon, kind, reach])
  }
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const bounds: BoundsFile['bounds'] = []
  points.forEach((point, at) => {
    if (point[2] > 2) return
    const area = boundaryOf(point, areas, points)
    if (!area) return
    bounds.push({ at, level: area.level, ...(area.name ? { name: area.name } : {}),
      rings: area.rings.map((ring) => encodeRing(simplify(ring, SIMPLIFY_M))) })
  })
  return { v: 1, source: 'OpenStreetMap via Geofabrik (ODbL)', generatedAt, points, bounds }
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    cities: { type: 'string', default: 'public/data/city/il' },
    out: { type: 'string', default: 'public/data/city/bounds.json' },
  } })
  const file = await buildBounds(positionals[0], values.cities!)
  const text = JSON.stringify(file)
  await writeFile(values.out!, text)
  console.log(`${file.points.length} places, ${file.bounds.length} boundaries, ${(text.length / 1024).toFixed(0)} kB`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main()

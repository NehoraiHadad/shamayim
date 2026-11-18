import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

type Position = [lon: number, lat: number]
type Polygon = Position[][]
export type Tags = Record<string, string | undefined>
export const METRES = 111_320
export const eastMetres = (lat: number) => METRES * Math.cos(lat * Math.PI / 180)
export const LANDUSE = new Set(['residential', 'commercial', 'industrial', 'retail'])

function ringStats(ring: Position[], [ox, oy]: Position) {
  let twice = 0, xSum = 0, ySum = 0
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[(i + 1) % ring.length]
    const cross = (ax - ox) * (by - oy) - (bx - ox) * (ay - oy)
    twice += cross
    xSum += (ax + bx - 2 * ox) * cross
    ySum += (ay + by - 2 * oy) * cross
  }
  return { area: Math.abs(twice) / 2, lon: ox + xSum / (3 * twice), lat: oy + ySum / (3 * twice) }
}

export function footprint(polygons: Polygon[]) {
  let area = 0, x = 0, y = 0
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity
  for (const [outer, ...holes] of polygons) {
    if (!outer?.length) continue
    for (const [lon, lat] of outer) {
      west = Math.min(west, lon)
      east = Math.max(east, lon)
      south = Math.min(south, lat)
      north = Math.max(north, lat)
    }
    for (const [i, ring] of [outer, ...holes].entries()) {
      const stats = ringStats(ring, outer[0])
      if (!stats.area) continue
      const weight = i ? -stats.area : stats.area
      area += weight
      x += stats.lon * weight
      y += stats.lat * weight
    }
  }
  if (!(area > 0)) return null
  const lat = y / area
  return { lat, lon: x / area, area: area * METRES * eastMetres(lat), west, east, south, north }
}
export type Footprint = NonNullable<ReturnType<typeof footprint>>
export type Feature = { tags: Tags; polygons: Polygon[]; shape: Footprint }

function inRing(ring: Position[], lon: number, lat: number) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[j]
    if ((ay > lat) !== (by > lat) && lon < ax + (bx - ax) * (lat - ay) / (by - ay)) inside = !inside
  }
  return inside
}

export function contains(polygons: Polygon[], lon: number, lat: number) {
  return polygons.some(([outer, ...holes]) => outer && inRing(outer, lon, lat) &&
    !holes.some(ring => inRing(ring, lon, lat)))
}

export async function* records(path: string) {
  const stream = createReadStream(path, { encoding: 'utf8' })
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  try {
    for await (const line of lines) {
      const record = line.replace(/^\s*\x1e/, '').trim()
      if (!record) continue
      const { geometry, properties: tags = {} } = JSON.parse(record) as {
        geometry?: { type: string; coordinates: Position | Polygon | Polygon[] }; properties?: Tags
      }
      yield { geometry, tags }
    }
  } finally {
    lines.close()
    stream.destroy()
  }
}

export async function* features(path: string): AsyncGenerator<Feature> {
  for await (const { geometry, tags } of records(path)) {
    const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates as Polygon] :
      geometry?.type === 'MultiPolygon' ? geometry.coordinates as Polygon[] : []
    if (!polygons.length) continue
    const shape = footprint(polygons)
    if (shape) yield { tags, polygons, shape }
  }
}

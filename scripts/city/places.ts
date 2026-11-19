import { cellKey } from '../../src/data/city/grid'
import type { PlaceRow } from '../../src/data/city/types'
import { offsetKm, type Coordinate } from '../../src/data/landmarks/project'
import { records } from './geometry'
import { applyPopulation, type Locality } from './population'

const kinds: Record<string, PlaceRow[2]> = { city: 0, town: 1, village: 2, hamlet: 3, isolated_dwelling: 3 }
const religions = ['jewish', 'muslim', 'christian', 'druze']

// Reach is rounded to the nearest 0.1 km before assigning worship or splitting cells.
export function reach(kind: PlaceRow[2], population?: number) {
  const minimum = [2, 1, .5, .3][kind]
  // Use village density for hamlets as well. Missing population scales the minimum.
  return Math.round(10 * (population
    ? Math.max(minimum, Math.sqrt(population / (Math.PI * (kind <= 1 ? 4000 : 1500))))
    : minimum * 1.5))
}

export function faith(counts: number[]): PlaceRow[3] {
  const ranked = counts.map((count, i) => ({ count, id: i + 1 })).sort((a, b) => b.count - a.count)
  const total = counts.reduce((sum, n) => sum + n, 0)
  return !total ? 0 : ranked[1].count / total >= .3 ? 5 : ranked[0].id as PlaceRow[3]
}

const coordinate = ([lat, lon]: PlaceRow) => ({ lat, lon })
function distance(point: Coordinate, node: Coordinate) {
  const { dx, dy } = offsetKm(point, node)
  return Math.hypot(dx, dy)
}

export class PlaceIndex {
  readonly cells = new Map<string, PlaceRow[]>()
  private bins = new Map<string, PlaceRow[]>()

  constructor(rows: PlaceRow[] = []) {
    for (const row of rows) {
      const [lat, lon, , , reach] = row
      const key = cellKey(lat, lon)
      const cell = this.cells.get(key) ?? []
      cell.push(row)
      this.cells.set(key, cell)
      // Search only within twice the stored reach. 70 km/degree safely bounds longitude in this extract.
      const dy = reach / 5 / 111.32, dx = reach / 5 / 70
      for (let y = Math.floor((lat - dy) * 10); y <= Math.floor((lat + dy) * 10); y++) {
        for (let x = Math.floor((lon - dx) * 10); x <= Math.floor((lon + dx) * 10); x++) {
          const binKey = `${y}_${x}`
          const bin = this.bins.get(binKey) ?? []
          bin.push(row)
          this.bins.set(binKey, bin)
        }
      }
    }
  }

  nearest(point: Coordinate) {
    let best: PlaceRow | undefined, score = 2
    for (const row of this.bins.get(cellKey(point.lat, point.lon)) ?? []) {
      const ratio = distance(point, coordinate(row)) * 10 / row[4]
      if (ratio > score || (ratio === score && best)) continue
      best = row
      score = ratio
    }
    return best
  }
}

/** Place nodes, their faith from the worship round them and then, where the CBS list knows the place, from its group. */
export async function readPlaces(path?: string, localities: Locality[] = []) {
  const rows: PlaceRow[] = []
  const worship: (Coordinate & { religion: number })[] = []
  if (!path) return new PlaceIndex()
  for await (const { tags, geometry } of records(path)) {
    if (geometry?.type !== 'Point') continue
    const [lon, lat] = geometry.coordinates as [number, number]
    const religion = religions.indexOf(tags.religion ?? '')
    if (tags.amenity === 'place_of_worship' && religion >= 0) worship.push({ lat, lon, religion })
    const kind = kinds[tags.place ?? '']
    const name = tags['name:he']?.trim() || tags.name?.trim() || tags['name:en']?.trim()
    if (kind === undefined || !name) continue
    const pop = Number(tags.population)
    rows.push([Number(lat.toFixed(5)), Number(lon.toFixed(5)), kind, 0,
      reach(kind, Number.isFinite(pop) && pop > 0 ? pop : undefined), name])
  }
  for (const row of rows) {
    const counts = [0, 0, 0, 0]
    for (const node of worship) if (distance(coordinate(row), node) <= row[4] / 10) counts[node.religion]++
    row[3] = faith(counts)
  }
  applyPopulation(rows, localities)
  return new PlaceIndex(rows)
}

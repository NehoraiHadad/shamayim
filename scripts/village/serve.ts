import { readFile } from 'node:fs/promises'
import type { BoundsFile } from '../../src/data/city/bounds'
import { landCellKey } from '../../src/data/land/grid'
import { servingGroup } from '../../src/data/village/footprintSource'
import { readTile, type LatLon, type VillageTile } from '../../src/data/village/tile'

export interface Served { own: number; none: number; missed: string[]; wrong: string[]; lent: string[] }

const same = (a: LatLon, b: LatLon) => a[0] === b[0] && a[1] === b[1]

/**
 * What the app would draw at each place point, from the one tile it fetches there: its own group, nothing where it has
 * none, and by mistake nothing (`missed`), another's group (`wrong`), or another's where it has none (`lent`).
 */
export function servedAt(points: readonly LatLon[], texts: ReadonlyMap<string, string>): Served {
  const read = new Map<string, VillageTile>([...texts].map(([key, text]) => [key, readTile(JSON.parse(text))!]))
  const owners = new Set([...read.values()].flatMap(tile => tile.groups.flatMap(group => group.places.map(String))))
  const served: Served = { own: 0, none: 0, missed: [], wrong: [], lent: [] }
  for (const point of points) {
    const tile = read.get(landCellKey(point[0], point[1]))
    const group = tile ? servingGroup(tile, { lat: point[0], lon: point[1] }) : null
    if (!group) {
      if (owners.has(String(point))) served.missed.push(String(point))
      else served.none++
    } else if (group.places.some(place => same(place, point))) served.own++
    else served[owners.has(String(point)) ? 'wrong' : 'lent'].push(String(point))
  }
  return served
}

export async function readPoints(path: string): Promise<LatLon[]> {
  const { points } = JSON.parse(await readFile(path, 'utf8')) as BoundsFile
  return points.map(([lat, lon]) => [lat, lon])
}
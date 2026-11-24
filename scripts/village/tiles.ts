import { houseAt, LINK_KM, PLACE_KM, SAME_KM } from '../../src/data/village/footprintSource'
import { decodeHouses, LAT_M, lonM } from '../../src/data/village/houseCode'
import { ODBL, TILE_VERSION, type LatLon, type StoredGroup, type StoredTile } from '../../src/data/village/tile'
import { farOf, tileKeyOf } from '../../src/data/village/where'
import { MICROSOFT, OSM, southWest, type RawGroup } from './input'
import { recordOf } from './record'

export const SOURCE = 'Overture Maps buildings'
/** The line each dataset's licence asks for (docs.overturemaps.org/attribution). A dataset that is not here fails the build. */
export const CREDITS: Record<string, string> = {
  [OSM]: '© OpenStreetMap contributors, Overture Maps Foundation',
  [MICROSOFT]: 'Global ML Building Footprints, licensed by Microsoft under the Open Database License',
}

/** The tiles that have ground within this far (km) of a point. */
function keysNear(point: LatLon, km: number): string[] {
  const [lat, lon] = point, north = km * 1000 / LAT_M, east = km * 1000 / lonM(Math.abs(lat) + north)
  const within = (value: number, from: number) => Math.max(from / 10, Math.min((from + 1) / 10, value))
  const keys: string[] = []
  for (let row = Math.floor((lat - north) * 10); row <= Math.floor((lat + north) * 10); row++) {
    for (let col = Math.floor((lon - east) * 10); col <= Math.floor((lon + east) * 10); col++) {
      const nearest = { lat: within(lat, row), lon: within(lon, col) }
      if (farOf(nearest, point) <= km + 1e-6) keys.push(tileKeyOf([(row + .5) / 10, (col + .5) / 10]))
    }
  }
  return keys
}

/** Every tile a place the group serves can stand in: round each stored house by the link distance, round each place point by its own. */
export function tileKeysOf({ o, p, h }: StoredGroup): string[] {
  const houses = decodeHouses(h)!.map(house => houseAt(o, house))
  return [...new Set([...houses.flatMap(house => keysNear(house, LINK_KM)), ...p.flatMap(place => keysNear(place, PLACE_KM))])].sort()
}
const credited = (dataset: string) => {
  if (!CREDITS[dataset]) throw new Error(`No credit line is known for footprints of "${dataset}"`)
  return dataset
}

interface Draft { groups: StoredGroup[]; datasets: Set<string> }

/** The tiles, by key, as they are written. `points`: every known place point, those with no footprints among them. */
export function tilesOf(groups: readonly RawGroup[], release: string, built: string, points: readonly LatLon[] = []): Map<string, StoredTile> {
  const drafts = new Map<string, Draft>()
  for (const group of groups) {
    const record = recordOf(group)
    for (const key of tileKeysOf(record)) {
      const draft = drafts.get(key) ?? { groups: [], datasets: new Set<string>() }
      drafts.set(key, draft)
      draft.groups.push(record)
      group.houses.forEach(house => draft.datasets.add(credited(house[6])))
    }
  }
  const owned = new Set(groups.flatMap(group => group.places.map(String)))
  const bare = points.filter(point => !owned.has(String(point))).sort(southWest).map(point => ({ point, keys: keysNear(point, SAME_KM) }))
  return new Map([...drafts].sort(([a], [b]) => a < b ? -1 : 1).map(([key, draft]) => [key, {
    v: TILE_VERSION, licence: ODBL.id, licenceUrl: ODBL.url,
    credits: Object.keys(CREDITS).filter(name => draft.datasets.has(name)).map(name => CREDITS[name]),
    source: SOURCE, release, built, bare: bare.filter(({ keys }) => keys.includes(key)).map(({ point }) => point),
    groups: draft.groups.sort((a, b) => southWest(a.o, b.o) || (a.h < b.h ? -1 : 1)),
  }]))
}
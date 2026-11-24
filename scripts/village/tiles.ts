import { landCellKey } from '../../src/data/land/grid'
import { LINK_KM, PLACE_KM } from '../../src/data/village/footprintSource'
import { LAT_M, lonM } from '../../src/data/village/houseCode'
import { ODBL, TILE_VERSION, type StoredGroup, type StoredTile } from '../../src/data/village/tile'
import { MICROSOFT, OSM, type RawGroup } from './input'
import { recordOf } from './record'

export const SOURCE = 'Overture Maps buildings'
/** The line each dataset's licence asks for (docs.overturemaps.org/attribution). A dataset that is not here fails the build. */
export const CREDITS: Record<string, string> = {
  [OSM]: '© OpenStreetMap contributors, Overture Maps Foundation',
  [MICROSOFT]: 'Global ML Building Footprints, licensed by Microsoft under the Open Database License',
}

const RING = [0, 1, 2, 3, 4, 5, 6, 7].map(k => [Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)])

/** Every tile a place the group serves can stand in: round each house by the link distance, round each place point by its own. */
export function tileKeysOf({ places, houses }: RawGroup): string[] {
  const keys = new Set<string>()
  const round = (lat: number, lon: number, km: number) => {
    keys.add(landCellKey(lat, lon))
    for (const [x, y] of RING) keys.add(landCellKey(lat + y * km * 1000 / LAT_M, lon + x * km * 1000 / lonM(lat)))
  }
  houses.forEach(([lat, lon]) => round(lat, lon, LINK_KM))
  places.forEach(([lat, lon]) => round(lat, lon, PLACE_KM))
  return [...keys].sort()
}

const credited = (dataset: string) => {
  if (!CREDITS[dataset]) throw new Error(`No credit line is known for footprints of "${dataset}"`)
  return dataset
}

interface Draft { groups: StoredGroup[]; datasets: Set<string> }

/** The tiles, by key, as they are written. */
export function tilesOf(groups: readonly RawGroup[], release: string, built: string): Map<string, StoredTile> {
  const drafts = new Map<string, Draft>()
  for (const group of groups) {
    const record = recordOf(group)
    for (const key of tileKeysOf(group)) {
      const draft = drafts.get(key) ?? { groups: [], datasets: new Set<string>() }
      drafts.set(key, draft)
      draft.groups.push(record)
      group.houses.forEach(house => draft.datasets.add(credited(house[6])))
    }
  }
  return new Map([...drafts].sort(([a], [b]) => a < b ? -1 : 1).map(([key, draft]) => [key, {
    v: TILE_VERSION, licence: ODBL.id, licenceUrl: ODBL.url,
    credits: Object.keys(CREDITS).filter(name => draft.datasets.has(name)).map(name => CREDITS[name]),
    source: SOURCE, release, built,
    groups: draft.groups.sort((a, b) => a.o[0] - b.o[0] || a.o[1] - b.o[1] || a.h.length - b.h.length),
  }]))
}

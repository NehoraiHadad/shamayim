import { N } from '../data/city/tune.tmp'
import { squareOf } from '../data/city/grid'
import { HOUSE_TOP_M } from '../data/city/outsideView'
import { roofHeight, STOREY_M } from '../data/city/skylineHeight'
import type { CityResult } from '../data/city/types'

/** A built cell's roof where the city raster knows nothing of it: a one- or two-storey house. */
const HOUSE_M = [STOREY_M + 1.5, 2 * STOREY_M + 1.5] as const
/** The city raster's typical storeys: of this height (m), and no more than it holds (`scripts/city/raster.ts`). */
const RASTER_STOREY_M = 3.2, MAX_LEVELS = 15
/** Below this share of the ground under roofs a raster square is sparse. */
const SPARSE = .2

const squareKey = (lat: number, lon: number) => Object.values(squareOf(lat, lon)).join(':')

/**
 * A built cell's roof (m) from the city raster's square under it, by its seeded `u`, and the house its site is laid out as
 * where that differs. A sparse square keeps its houses, unless its typical building is a block: then it stands at the
 * typical roof, with no tail. Where that is as tall as a mapped tower there, it is the tower, which is drawn as itself.
 */
export function fabricHeights(city: CityResult | null | undefined) {
  // The lowest mapped tower of each square, in the raster's own storeys.
  const towerLevels = new Map<string, number>()
  for (const { lat, lon, heightM } of city?.towers ?? []) {
    const key = squareKey(lat, lon)
    towerLevels.set(key, Math.min(towerLevels.get(key) ?? MAX_LEVELS, Math.round(heightM / RASTER_STOREY_M)))
  }
  return (lat: number, lon: number, u: number): { heightM: number; siteHeightM?: number } => {
    const at = city?.raster?.at(lat, lon)
    if (at && at.built >= SPARSE) return { heightM: roofHeight(at.levels, at.p90, u) }
    const house = HOUSE_M[u < .6 ? 0 : 1]
    const typical = at ? roofHeight(at.levels, 0, 0) : house
    if (typical < HOUSE_TOP_M || N('tower') && at!.levels >= (towerLevels.get(squareKey(lat, lon)) ?? Infinity)) return { heightM: house }
    return { heightM: typical, siteHeightM: house }
  }
}

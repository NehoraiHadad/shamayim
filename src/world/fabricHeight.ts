import { LAT_STEP, LON_STEP, squareOf } from '../data/city/grid'
import type { RasterSquare } from '../data/city/cityRaster'
import { HOUSE_TOP_M } from '../data/city/outsideView'
import { roofHeight, STOREY_M } from '../data/city/skylineHeight'
import { TOWER_FRONT_M } from '../data/city/towerWidth'
import type { CityResult, CityTower } from '../data/city/types'

/** A built cell's roof where the city raster knows nothing of it: a one- or two-storey house. */
const HOUSE_M = [STOREY_M + 1.5, 2 * STOREY_M + 1.5] as const
/** The city raster's typical storeys: of this height (m), and no more than it holds (`scripts/city/raster.ts`). */
const RASTER_STOREY_M = 3.2, MAX_LEVELS = 15
/** Below this share of the ground under roofs a raster square is sparse. */
const SPARSE = .2

const squareKey = (lat: number, lon: number) => Object.values(squareOf(lat, lon)).join(':')
const squareM2 = (lat: number) => LAT_STEP * LON_STEP * Math.cos(lat * Math.PI / 180) * 111_320 ** 2
/** A site laid out as the roof that stands on it. */
const whole = (heightM: number) => ({ heightM, siteHeightM: heightM })
const rasterLevels = (heightM: number) => Math.min(MAX_LEVELS, Math.round(heightM / RASTER_STOREY_M))

/**
 * Whether a square's typical building (its median by roof area) is a mapped tower: one of its towers stands at the typical
 * storeys, and those no lower cover half of what is built. A lone tower too slight for that stands among others as tall.
 */
function typicalIsTower(at: RasterSquare, lat: number, towers: readonly CityTower[]) {
  const tall = towers.filter(t => rasterLevels(t.heightM) >= at.levels)
  const towersM2 = tall.reduce((sum, t) => sum + TOWER_FRONT_M[t.wClass] ** 2, 0)
  return tall.some(t => rasterLevels(t.heightM) === at.levels) && towersM2 >= at.built * squareM2(lat) / 2
}

/**
 * A built cell's roof (m) from the city raster's square under it, by its seeded `u`, and the house its site is laid out as
 * where that differs. A sparse square keeps its houses, unless its typical building is a block: then it stands at the
 * typical roof, with no tail. Where that building is a mapped tower, it is drawn as itself and the rest stay houses.
 */
export function fabricHeights(city: CityResult | null | undefined) {
  const towersOf = new Map<string, CityTower[]>()
  for (const tower of city?.towers ?? []) {
    const key = squareKey(tower.lat, tower.lon), square = towersOf.get(key)
    if (square) square.push(tower)
    else towersOf.set(key, [tower])
  }
  return (at: RasterSquare | undefined, lat: number, lon: number, u: number): { heightM: number; siteHeightM: number } => {
    if (at && at.built >= SPARSE) return whole(roofHeight(at.levels, at.p90, u))
    const house = HOUSE_M[u < .6 ? 0 : 1]
    const typical = at ? roofHeight(at.levels, 0, 0) : house
    if (typical < HOUSE_TOP_M || typicalIsTower(at!, lat, towersOf.get(squareKey(lat, lon)) ?? [])) return whole(house)
    return { heightM: typical, siteHeightM: house }
  }
}

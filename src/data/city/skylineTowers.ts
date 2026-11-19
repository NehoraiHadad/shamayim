import { hashId } from '../landmarks/hash'
import { bearingOf, distanceOf, type Coordinate } from '../landmarks/project'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import type { CityRaster } from './cityRaster'
import { SHAFT_WIDTHS, type PlacedTower } from './cityTowers'
import { COLUMN_WIDTH } from './columns'
import { inSkylineReach, SKYLINE_FROM_KM, SKYLINE_TO_KM, skylineBand, skylineRay, solidRoofs, type SkylineView } from './skylineRay'
import type { CityTower } from './types'

export type SkylineTower = PlacedTower & { km: number; location: Coordinate }
export const sameTower = (a: Coordinate, b: Coordinate) => distanceOf(a, b) <= .25

export function projectSkylineTowers(place: Coordinate, raster: CityRaster, view: SkylineView, width: number,
  eyeLiftM: number, towers: readonly CityTower[]): SkylineTower[] {
  return towers.flatMap(tower => {
    const bearing = bearingOf(place, tower, view.camera)
    if (!bearing || !inSkylineReach(bearing.km)) return []
    const km = Math.max(SKYLINE_FROM_KM, Math.min(SKYLINE_TO_KM, bearing.km))
    const x = bearing.x * width / RIDGE_WIDTH
    const ray = skylineRay(view, x, width, eyeLiftM)
    const top = ray.roofAt(km, tower.heightM)
    if (!top || top.top >= top.foot || top.angle <= ray.terrainAt(km)) return []
    const column = Math.min(Math.floor(x / COLUMN_WIDTH), Math.ceil(width / COLUMN_WIDTH) - 1)
    for (const roof of solidRoofs(place, raster, ray.azimuth, column, km)) {
      const nearer = ray.roofAt(roof.km, roof.heightM)
      if (nearer && nearer.angle >= top.angle) return []
    }
    const shaft = SHAFT_WIDTHS[tower.wClass]
    return [{ x, km, location: tower, name: tower.name, row: skylineBand(km),
      w: Math.max(2, Math.min(shaft, shaft * 1.5 / km)), h: top.foot - top.top, baseY: top.foot,
      seed: hashId(`${tower.lat.toFixed(5)}:${tower.lon.toFixed(5)}`) }]
  })
}

export function splitSkylineTowers(towers: readonly SkylineTower[], curated: readonly Coordinate[]) {
  const glyphs: SkylineTower[] = [], slabs: SkylineTower[] = []
  const ranked = towers.filter(tower => !curated.some(mark => sameTower(mark, tower.location)))
    .sort((a, b) => b.h - a.h || a.x - b.x || a.km - b.km || a.seed - b.seed)
  for (const tower of ranked) {
    // Below 12 px the Highrise setbacks and podium do not fit at their normal sizes.
    if (glyphs.length < 14 && tower.h >= 12) glyphs.push(tower)
    else slabs.push(tower)
  }
  return { glyphs: glyphs.sort((a, b) => b.km - a.km), slabs }
}

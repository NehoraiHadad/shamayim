import { hashId, seeded } from '../landmarks/hash'
import type { Coordinate } from '../landmarks/project'
import { apparentAngle, azimuthAt, RAY_DISTANCES } from '../terrain/panorama'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import type { SceneTerrain } from '../terrain/terrain'
import { CITY_GRID, type CityRaster } from './cityRaster'
import { LAT_STEP, LON_STEP } from './grid'
import { cellSpans, type CellSpan } from './rayWalk'
import { roofHeight } from './skylineHeight'

export const SKYLINE_FROM_KM = RAY_DISTANCES[0]
export const SKYLINE_TO_KM = 6
const DISTANCE_EPSILON = 1e-9
export const inSkylineReach = (km: number) => km >= SKYLINE_FROM_KM - DISTANCE_EPSILON && km <= SKYLINE_TO_KM + DISTANCE_EPSILON
const BAND_ENDS = [1.2, 3, SKYLINE_TO_KM] as const
export type SkylineBand = 0 | 1 | 2
export const skylineBand = (km: number): SkylineBand => km < BAND_ENDS[0] ? 0 : km < BAND_ENDS[1] ? 1 : 2

export type SkylineView = Required<Pick<SceneTerrain, 'sightAt' | 'groundAt' | 'angleY'>> & {
  ground: (x: number) => number
}

export function skylineRay(view: SkylineView, x: number, width: number, eyeLiftM: number) {
  const fraction = x / width
  const ridgeX = fraction * RIDGE_WIDTH
  const nearKm = view.sightAt(ridgeX).nearKm
  const ridgeY = view.ground(x)
  const groundAt = (km: number) => view.groundAt(ridgeX, km)
  const angle = (height: number, km: number) => apparentAngle(height - eyeLiftM, km, 0)
  let i = 0, horizon = -Infinity
  return {
    azimuth: azimuthAt(fraction),
    terrainAt(km: number) {
      // Include every DEM vertex in front, even in empty cells or narrower than the city step.
      while (RAY_DISTANCES[i] <= km) {
        const d = RAY_DISTANCES[i++]
        const height = groundAt(d)
        if (height !== null) horizon = Math.max(horizon, angle(height, d))
      }
      const height = groundAt(km)
      if (height !== null) horizon = Math.max(horizon, angle(height, km))
      return horizon
    },
    roofAt(km: number, heightM: number) {
      const height = groundAt(km)
      if (height === null) return null
      const groundM = Math.min(groundAt(km - .1) ?? height, height, groundAt(km + .1) ?? height)
      const topAngle = angle(groundM + heightM, km)
      // The foot joins the land drawing, which still uses the original eye level.
      return { angle: topAngle, top: view.angleY(topAngle),
        foot: km <= nearKm ? view.angleY(apparentAngle(groundM, km, 0)) : ridgeY, groundM }
    },
  }
}

/** Stitch chords within a square before applying cover to the square's full along-ray length. */
function* skylineCells(place: Coordinate, azimuth: number) {
  let cell: CellSpan | undefined
  for (const span of cellSpans(place, azimuth, SKYLINE_FROM_KM, SKYLINE_TO_KM, CITY_GRID)) {
    if (cell && cell.col === span.col && cell.row === span.row) {
      cell.end = span.end
    } else {
      if (cell) yield cell
      cell = span
    }
  }
  if (cell) yield cell
}

export function* solidRoofs(place: Coordinate, raster: CityRaster, azimuth: number, column: number,
  until = SKYLINE_TO_KM) {
  for (const { col, row, start, end } of skylineCells(place, azimuth)) {
    if (start >= until) break
    const { built: cover, levels, p90 } = raster.at((row + .5) * LAT_STEP, (col + .5) * LON_STEP)
    if (cover <= 0) continue
    const random = seeded(hashId(`${column}:${col}:${row}`))
    const probability = 1 - (1 - cover) ** ((end - start) * 1000 / 20)
    if (random() >= probability) continue
    const heightM = roofHeight(levels, p90, random())
    for (let from = start; from < end - 1e-9;) {
      const to = Math.min(end, BAND_ENDS[skylineBand(from)])
      const count = Math.ceil((to - from) / .25)
      for (let i = 0; i < count; i++) {
        const km = from + (i + .5) * (to - from) / count
        if (km >= until) return
        yield { km, heightM, cover }
      }
      from = to
    }
  }
}

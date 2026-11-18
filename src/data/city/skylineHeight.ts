import { distanceOf, type Coordinate } from '../landmarks/project'
import { destination } from '../terrain/panorama'
import type { CityRaster } from './cityRaster'
import { LAT_STEP, LON_STEP } from './grid'

export const STOREY_M = 3.1
const MAX_ROOF_M = 60
const HOME_KM = .3
const typicalRoof = (levels: number, p90: number) =>
  levels > 0 ? Math.min(MAX_ROOF_M, levels * STOREY_M + 1) : p90 > 0 ? Math.min(10, Math.max(7, p90)) : 10

export function roofHeight(levels: number, p90: number, u: number) {
  const typ = typicalRoof(levels, p90)
  const hi = Math.max(typ, Math.min(MAX_ROOF_M, p90))
  return typ + (hi - typ) * u * u
}

/** Raise the eye to the local roofline when the surrounding squares are substantially built. */
export function homeRoof(place: Coordinate, raster: CityRaster) {
  const [north, east, south, west] = [0, 90, 180, 270].map(az => destination(place.lat, place.lon, HOME_KM, az))
  const squares: { built: number; height: number }[] = []
  let count = 0, total = 0
  for (let row = Math.floor(south.lat / LAT_STEP); row <= Math.floor(north.lat / LAT_STEP); row++) {
    for (let col = Math.floor(west.lon / LON_STEP); col <= Math.floor(east.lon / LON_STEP); col++) {
      const point = { lat: (row + .5) * LAT_STEP, lon: (col + .5) * LON_STEP }
      if (distanceOf(place, point) > HOME_KM) continue
      const { built, levels, p90 } = raster.at(point.lat, point.lon)
      count++
      total += built
      if (built > 0) squares.push({ built, height: typicalRoof(levels, p90) })
    }
  }
  if (!count || total / count < .1) return 0
  squares.sort((a, b) => a.height - b.height)
  let weight = 0
  for (const { built, height } of squares) {
    weight += built
    if (weight >= total / 2) return Math.min(20, height)
  }
  return 0
}

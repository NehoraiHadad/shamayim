import { offsetKm, type Coordinate } from '../landmarks/project'
import { landCellKey } from '../land/grid'
import type { LatLon } from './tile'

/** A longitude between -180 (held) and 180 (not). */
export const wrapLon = (lon: number) => lon >= -180 && lon < 180 ? lon : ((lon + 180) % 360 + 360) % 360 - 180

/** Km east and north of the place, the short way round the globe. */
export const offsetOf = (place: Coordinate, { lat, lon }: Coordinate) =>
  offsetKm(place, { lat, lon: place.lon + wrapLon(lon - place.lon) })

export const farOf = (place: Coordinate, [lat, lon]: LatLon) => {
  const { dx, dy } = offsetOf(place, { lat, lon })
  return Math.hypot(dx, dy)
}

/** How far the nearest of these points is, km (no point: infinitely far). */
export function nearestOf(place: Coordinate, points: Iterable<LatLon>): number {
  let least = Infinity
  for (const point of points) least = Math.min(least, farOf(place, point))
  return least
}

/** The key of the tile a point stands in (`landCellKey`), on either side of the date line. */
export const tileKeyOf = ([lat, lon]: LatLon) => landCellKey(lat, wrapLon(lon))
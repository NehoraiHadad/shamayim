/** Small spherical-earth helpers for drawing around the place (rings, arrows, pointers). */

const radians = Math.PI / 180
export const EARTH_KM = 6371

export type LonLat = [number, number]

/** The point `km` away from `[lon, lat]` along `bearing` (degrees from north, clockwise). */
export function destination([lon, lat]: LonLat, km: number, bearing: number): LonLat {
  const latitude = lat * radians
  const distance = km / EARTH_KM
  const heading = bearing * radians
  const y = Math.asin(Math.sin(latitude) * Math.cos(distance)
    + Math.cos(latitude) * Math.sin(distance) * Math.cos(heading))
  const dx = Math.atan2(Math.sin(heading) * Math.sin(distance) * Math.cos(latitude),
    Math.cos(distance) - Math.sin(latitude) * Math.sin(y))
  return [lon + dx / radians, y / radians]
}

/** Great-circle distance in km between two points. */
export function distanceKm([lon1, lat1]: LonLat, [lon2, lat2]: LonLat): number {
  const a = Math.sin(((lat2 - lat1) * radians) / 2) ** 2
    + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(((lon2 - lon1) * radians) / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** A closed circle of `km` around a point, as `steps + 1` points (first and last equal). */
export function circle(centre: LonLat, km: number, steps = 72): LonLat[] {
  return Array.from({ length: steps + 1 }, (_, i) => destination(centre, km, (i / steps) * 360))
}

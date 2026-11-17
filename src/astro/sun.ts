const RAD = Math.PI / 180
const DAY_MS = 86_400_000
const J2000 = 2_451_545

export interface EquatorialPosition {
  rightAscension: number
  declination: number
  distanceKm: number
}

export const julianDay = (at: Date) => at.getTime() / DAY_MS + 2_440_587.5
export const daysSinceJ2000 = (at: Date) => julianDay(at) - J2000
export const normalizeRadians = (angle: number) => {
  const turn = angle % (2 * Math.PI)
  return turn < 0 ? turn + 2 * Math.PI : turn
}

export function sunEquatorial(at: Date): EquatorialPosition {
  const d = daysSinceJ2000(at)
  const meanAnomaly = RAD * (357.5291 + 0.98560028 * d)
  const equation = RAD * (
    1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) +
    0.0003 * Math.sin(3 * meanAnomaly)
  )
  const longitude = meanAnomaly + equation + RAD * 102.9372 + Math.PI
  const obliquity = RAD * 23.4397
  return {
    rightAscension: Math.atan2(Math.sin(longitude) * Math.cos(obliquity), Math.cos(longitude)),
    declination: Math.asin(Math.sin(obliquity) * Math.sin(longitude)),
    distanceKm: 149_598_000,
  }
}

export const siderealTime = (at: Date, longitude: number) =>
  RAD * (280.16 + 360.9856235 * daysSinceJ2000(at) + longitude)

export function horizontalPosition(
  equatorial: EquatorialPosition,
  at: Date,
  lat: number,
  lon: number,
) {
  const latitude = lat * RAD
  const hourAngle = siderealTime(at, lon) - equatorial.rightAscension
  const altitude = Math.asin(
    Math.sin(latitude) * Math.sin(equatorial.declination) +
    Math.cos(latitude) * Math.cos(equatorial.declination) * Math.cos(hourAngle),
  )
  const southBased = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitude) -
      Math.tan(equatorial.declination) * Math.cos(latitude),
  )
  return {
    altitude: altitude / RAD,
    azimuth: normalizeRadians(southBased + Math.PI) / RAD,
  }
}

export function sunPosition(at: Date, lat: number, lon: number) {
  return horizontalPosition(sunEquatorial(at), at, lat, lon)
}

import {
  daysSinceJ2000, horizontalPosition, normalizeRadians, sunEquatorial,
  type EquatorialPosition,
} from './sun'

const RAD = Math.PI / 180
const EARTH_RADIUS_KM = 6378.14
const MOON_RADIUS_KM = 1737.4

export function moonEquatorial(at: Date): EquatorialPosition {
  const d = daysSinceJ2000(at)
  const meanLongitude = RAD * (218.316_447_7 + 13.176_396_48 * d)
  const meanAnomaly = RAD * (134.963_396_4 + 13.064_992_95 * d)
  const solarAnomaly = RAD * (357.529_109_2 + 0.985_600_28 * d)
  const elongation = RAD * (297.850_192_1 + 12.190_749_12 * d)
  const argumentLatitude = RAD * (93.272_095 + 13.229_350_24 * d)
  // Dominant Meeus periodic terms give sub-degree accuracy without ephemeris data.
  const longitude = meanLongitude + RAD * (
    6.289 * Math.sin(meanAnomaly) +
    1.274 * Math.sin(2 * elongation - meanAnomaly) +
    0.658 * Math.sin(2 * elongation) + 0.214 * Math.sin(2 * meanAnomaly) -
    0.186 * Math.sin(solarAnomaly) - 0.059 * Math.sin(2 * elongation - 2 * meanAnomaly) -
    0.057 * Math.sin(2 * elongation - solarAnomaly - meanAnomaly) +
    0.053 * Math.sin(2 * elongation + meanAnomaly) +
    0.046 * Math.sin(2 * elongation - solarAnomaly) +
    0.041 * Math.sin(solarAnomaly - meanAnomaly) - 0.035 * Math.sin(elongation) -
    0.031 * Math.sin(solarAnomaly + meanAnomaly) -
    0.015 * Math.sin(2 * argumentLatitude - 2 * elongation) +
    0.011 * Math.sin(2 * elongation - 4 * meanAnomaly)
  )
  const latitude = RAD * (
    5.128 * Math.sin(argumentLatitude) +
    0.281 * Math.sin(meanAnomaly + argumentLatitude) +
    0.278 * Math.sin(meanAnomaly - argumentLatitude) +
    0.173 * Math.sin(2 * elongation - argumentLatitude) +
    0.055 * Math.sin(2 * elongation + argumentLatitude - meanAnomaly) +
    0.046 * Math.sin(2 * elongation - argumentLatitude - meanAnomaly) +
    0.033 * Math.sin(2 * elongation + argumentLatitude) +
    0.017 * Math.sin(2 * meanAnomaly + argumentLatitude)
  )
  const distanceKm = 385_001 - 20_905 * Math.cos(meanAnomaly) -
    3_699 * Math.cos(2 * elongation - meanAnomaly) - 2_956 * Math.cos(2 * elongation) -
    570 * Math.cos(2 * meanAnomaly)
  const obliquity = RAD * 23.4397
  return {
    rightAscension: Math.atan2(
      Math.sin(longitude) * Math.cos(obliquity) - Math.tan(latitude) * Math.sin(obliquity),
      Math.cos(longitude),
    ),
    declination: Math.asin(
      Math.sin(latitude) * Math.cos(obliquity) +
      Math.cos(latitude) * Math.sin(obliquity) * Math.sin(longitude),
    ),
    distanceKm,
  }
}

/** Position and angular radius as seen by the observer, using the same spherical Earth for both. */
export function moonPosition(at: Date, lat: number, lon: number) {
  const moon = moonEquatorial(at)
  const horizontal = horizontalPosition(moon, at, lat, lon)
  const altitude = horizontal.altitude * RAD
  const horizontalKm = moon.distanceKm * Math.cos(altitude)
  const aboveObserverKm = moon.distanceKm * Math.sin(altitude) - EARTH_RADIUS_KM
  const observerDistanceKm = Math.hypot(horizontalKm, aboveObserverKm)
  return {
    altitude: Math.atan2(aboveObserverKm, horizontalKm) / RAD,
    azimuth: horizontal.azimuth,
    distanceKm: moon.distanceKm,
    angularRadiusDeg: Math.asin(MOON_RADIUS_KM / observerDistanceKm) / RAD,
  }
}

export function moonIllumination(at: Date) {
  const sun = sunEquatorial(at)
  const moon = moonEquatorial(at)
  const elongation = Math.acos(
    Math.sin(sun.declination) * Math.sin(moon.declination) +
    Math.cos(sun.declination) * Math.cos(moon.declination) *
      Math.cos(sun.rightAscension - moon.rightAscension),
  )
  const phaseAngle = Math.atan2(
    sun.distanceKm * Math.sin(elongation),
    moon.distanceKm - sun.distanceKm * Math.cos(elongation),
  )
  const fraction = (1 + Math.cos(phaseAngle)) / 2
  const phase = normalizeRadians(moon.rightAscension - sun.rightAscension) / (2 * Math.PI)
  return { fraction, phase, waxing: phase < 0.5 }
}

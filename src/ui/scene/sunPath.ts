import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import { daylightFraction } from '../../domain/time'
import type { LocalDate, LocalTime } from '../../domain/types'
import { FLAT_SKYLINE, type Skyline } from './skyline'
import { horizonLine, projectSky } from './skyProjection'

export { FLOOR_Y, HORIZON_Y, SCENE_H, SCENE_W, SEA_Y } from './sceneBox'

/** Solar declination in degrees for a date (simple cosine model, ±0.5°). */
export function declination(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number)
  const dayOfYear = (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000
  return -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10))
}

/** The sun's height at solar noon, in degrees. */
export function noonElevation(date: LocalDate, lat: number): number {
  return 90 - lat + declination(date)
}

export interface SunPoint {
  /** 0 at sunrise, 1 at sunset. */
  t: number
  /** Horizontal position as a fraction of the scene width (0 = west/left). */
  x: number
  /** Vertical position in px from the scene top. */
  y: number
}

/** Where the sky is seen from: coordinates and the zone the day's sunrise and sunset are written in. */
export interface SunSite {
  lat: number
  lon: number
  timezone: string
}

/** The API's sunrise and sunset are when the disc's top meets a flat horizon (refraction): its centre is this low. */
const RISE_ALTITUDE = -0.833

/**
 * The sun at a daylight fraction (0 = sunrise, 1 = sunset; outside that, before or after) as it really is: its true
 * azimuth across and true altitude up (see `skyProjection.ts`), on the horizon line from the ridge where it rises
 * today to the ridge where it sets. So in winter it rises south of east and stays low, in summer north of east and
 * climbs high, and it rises and sets on a slant. Before sunrise and after sunset it sinks behind the ridge.
 */
export function sunAt(t: number, sunrise: LocalTime, sunset: LocalTime, site: SunSite, skyline: Skyline = FLAT_SKYLINE): SunPoint {
  const rise = utcOf(sunrise, site.timezone).getTime()
  const set = utcOf(sunset, site.timezone).getTime()
  const at = new Date(rise + (set - rise) * t)
  const h = horizonLine(sunSky(new Date(rise), site.lat, site.lon).azimuth, sunSky(new Date(set), site.lat, site.lon).azimuth, skyline)
  const { altitude, azimuth } = sunSky(at, site.lat, site.lon)
  const { x, y } = projectSky(altitude - RISE_ALTITUDE, azimuth, h)
  return { t, x, y }
}

/**
 * Where the sun is at `time`, or null when it is below the horizon. `margin` (a share of the day) keeps a point a little
 * past sunrise and sunset, below the ridge, so the drawn disc sinks behind it instead of vanishing on it.
 */
export function sunPosition(
  time: LocalTime,
  sunrise: LocalTime,
  sunset: LocalTime,
  site: SunSite,
  skyline: Skyline = FLAT_SKYLINE,
  margin = 0,
): SunPoint | null {
  const t = daylightFraction(time, sunrise, sunset)
  if (t < -margin || t > 1 + margin) return null
  return sunAt(t, sunrise, sunset, site, skyline)
}

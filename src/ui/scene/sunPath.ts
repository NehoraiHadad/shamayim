import { daylightFraction } from '../../domain/time'
import type { LocalDate, LocalTime } from '../../domain/types'
import { altitudeY, FLAT_SKYLINE, type Skyline } from './skyline'

import { SCENE_W } from './sceneBox'
export { FLOOR_Y, HORIZON_Y, SCENE_H, SCENE_W, SEA_Y } from './sceneBox'

/** Sun path: rises behind the Gilead (east, right) and sets behind Samaria (west, left). */
const RISE_X = 322
const SET_X = 53

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

/** Point on today's arc for a daylight fraction, lifted from the ridge at x; the arc is lower in winter. */
export function sunAt(t: number, date: LocalDate, lat: number, skyline: Skyline = FLAT_SKYLINE): SunPoint {
  const x = (RISE_X - (RISE_X - SET_X) * t) / SCENE_W
  const altitude = noonElevation(date, lat) * Math.sin(Math.PI * t)
  return { t, x, y: altitudeY(skyline, x, altitude) }
}

/**
 * Where the sun is at `time`, or null when it is below the horizon. `margin` (a share of the day) keeps a point a little
 * past sunrise and sunset, below the ridge, so the drawn disc sinks behind it instead of vanishing on it.
 */
export function sunPosition(
  time: LocalTime,
  sunrise: LocalTime,
  sunset: LocalTime,
  lat: number,
  skyline: Skyline = FLAT_SKYLINE,
  margin = 0,
): SunPoint | null {
  const t = daylightFraction(time, sunrise, sunset)
  if (t < -margin || t > 1 + margin) return null
  return sunAt(t, time.slice(0, 10), lat, skyline)
}

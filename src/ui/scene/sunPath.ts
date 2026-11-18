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

/** How fast the disc drops once below the ridge (px per day-fraction squared), so it slips out of sight quickly. */
const SINK = 1800

/**
 * Point on today's arc for a daylight fraction. The arc is one smooth sine from the ridge where the sun rises to the
 * ridge where it sets, peaking at the real noon height (lower in winter), so it never dips or kinks near the horizon.
 * Past rise and set it keeps the same slope and then accelerates down behind the ridge.
 */
export function sunAt(t: number, date: LocalDate, lat: number, skyline: Skyline = FLAT_SKYLINE): SunPoint {
  const x = (RISE_X - (RISE_X - SET_X) * t) / SCENE_W
  const riseY = skyline(RISE_X / SCENE_W)
  const setY = skyline(SET_X / SCENE_W)
  const noonY = altitudeY(skyline, 0.5, noonElevation(date, lat))
  const lift = Math.max(0, (riseY + setY) / 2 - noonY)
  const below = Math.max(0, -t, t - 1)
  const y = riseY + (setY - riseY) * t - lift * Math.sin(Math.PI * t) + SINK * below * below
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
  lat: number,
  skyline: Skyline = FLAT_SKYLINE,
  margin = 0,
): SunPoint | null {
  const t = daylightFraction(time, sunrise, sunset)
  if (t < -margin || t > 1 + margin) return null
  return sunAt(t, time.slice(0, 10), lat, skyline)
}

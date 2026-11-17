import { daylightFraction } from '../../domain/time'
import type { LocalDate, LocalTime } from '../../domain/types'

/** Scene drawing box (px). The SVG stretches horizontally; heights are fixed. */
export const SCENE_W = 375
export const SCENE_H = 128
/** y of the sea-level line and of the valley floor where the village sits. */
export const SEA_Y = 72
export const FLOOR_Y = 96
/** Sun path: rises behind the Gilead (east, right) and sets behind Samaria (west, left). */
const RISE_X = 322
const SET_X = 53
export const HORIZON_Y = 70

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

/** Point on today's arc for a daylight fraction; the arc is lower in winter. */
export function sunAt(t: number, date: LocalDate, lat: number): SunPoint {
  const peakY = HORIZON_Y - 66 * (noonElevation(date, lat) / 90)
  const x = (RISE_X - (RISE_X - SET_X) * t) / SCENE_W
  const y = HORIZON_Y - (HORIZON_Y - peakY) * Math.sin(Math.PI * t)
  return { t, x, y }
}

/** Where the sun is at `time`, or null when it is below the horizon. */
export function sunPosition(
  time: LocalTime,
  sunrise: LocalTime,
  sunset: LocalTime,
  lat: number,
): SunPoint | null {
  const t = daylightFraction(time, sunrise, sunset)
  if (t < 0 || t > 1) return null
  return sunAt(t, time.slice(0, 10), lat)
}

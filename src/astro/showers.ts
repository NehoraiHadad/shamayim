import type { LocalDate } from '../domain/types'
import { sunLongitude } from './planets'
import { julianDay } from './sun'

/*
 * The annual meteor showers (C10): the IMO's working list of the major showers, their peak date, peak zenithal hourly rate
 * (ZHR), how fast the activity falls off either side of the peak (a Gaussian in days, from the IMO's activity profiles)
 * and the radiant (RA, Dec in degrees, at the peak). A night is a shower night when a shower's rate that night is at least
 * `SHOWER_MIN_ZHR`: meteors are drawn only then (the sporadic background of a few an hour is left out).
 */

export interface Shower {
  name: string
  /** MM-DD of the peak (the solar longitude's date in a common year; it slips by ≤ 1 day over the leap cycle). */
  peak: string
  /** The sun's longitude (J2000, deg) at the peak: the IMO Meteor Shower Calendars 2026 and 2027 (imo.net). */
  longitude: number
  zhr: number
  /** Days for the rate to fall to 61 % of the peak (one sigma). */
  sigma: number
  ra: number
  dec: number
  /** Entry speed (km/s): fast meteors leave longer, brighter trails. */
  speed: number
}

export const SHOWERS: readonly Shower[] = [
  { name: 'Quadrantids', peak: '01-04', longitude: 283.15, zhr: 110, sigma: 0.45, ra: 230, dec: 49, speed: 41 },
  { name: 'Lyrids', peak: '04-22', longitude: 32.32, zhr: 18, sigma: 1, ra: 271, dec: 34, speed: 49 },
  { name: 'eta Aquariids', peak: '05-06', longitude: 45.5, zhr: 50, sigma: 4, ra: 338, dec: -1, speed: 66 },
  { name: 'Southern delta Aquariids', peak: '07-30', longitude: 128, zhr: 25, sigma: 5, ra: 340, dec: -16, speed: 41 },
  { name: 'Perseids', peak: '08-12', longitude: 140.05, zhr: 100, sigma: 2.5, ra: 48, dec: 58, speed: 59 },
  { name: 'Draconids', peak: '10-08', longitude: 195.4, zhr: 10, sigma: 0.4, ra: 262, dec: 54, speed: 20 },
  { name: 'Orionids', peak: '10-21', longitude: 208, zhr: 20, sigma: 3.5, ra: 95, dec: 16, speed: 66 },
  { name: 'Leonids', peak: '11-17', longitude: 235.27, zhr: 15, sigma: 1, ra: 152, dec: 22, speed: 71 },
  { name: 'Geminids', peak: '12-14', longitude: 262.2, zhr: 150, sigma: 1.1, ra: 112, dec: 33, speed: 35 },
  { name: 'Ursids', peak: '12-22', longitude: 270.7, zhr: 10, sigma: 0.7, ra: 217, dec: 76, speed: 33 },
]

/** A night counts as a shower night from this ZHR. */
export const SHOWER_MIN_ZHR = 8

const DAY_MS = 86_400_000

/** Days from a shower's peak to a date (signed, the nearest peak across the year's turn). */
function daysFromPeak(date: LocalDate, peak: string): number {
  const year = Number(date.slice(0, 4))
  const t = Date.UTC(year, Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))
  const p = (y: number) => Date.UTC(y, Number(peak.slice(0, 2)) - 1, Number(peak.slice(3, 5)))
  const ds = [p(year - 1), p(year), p(year + 1)].map((v) => (t - v) / DAY_MS)
  return ds.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a))
}

/**
 * The shower active on the night of `date` (the night that begins on it: a local evening's date, the small hours count to
 * the evening before), with its rate that night; null when none reaches `SHOWER_MIN_ZHR`.
 */
export function showerOn(date: LocalDate): { shower: Shower; zhr: number } | null {
  let best: { shower: Shower; zhr: number } | null = null
  for (const shower of SHOWERS) {
    // The night of the date spans its evening and the next morning: measured at its middle.
    const d = daysFromPeak(date, shower.peak) + 0.5
    const zhr = shower.zhr * Math.exp(-0.5 * (d / shower.sigma) ** 2)
    if (zhr >= SHOWER_MIN_ZHR && (!best || zhr > best.zhr)) best = { shower, zhr }
  }
  return best
}

/** The instant (ms) of a shower's peak nearest to a time: when the sun stands at its longitude. */
export function peakNear(shower: Shower, ms: number): number {
  let at = ms
  for (let k = 0; k < 4; k++) {
    const date = new Date(at)
    // The calendar's longitudes are of J2000, the sun's of the date: the precession between them.
    const longitude = sunLongitude(date) - 1.396971 * (julianDay(date) - 2451545) / 36525
    at += (((shower.longitude - longitude + 180) % 360 + 360) % 360 - 180) / 360 * 365.25 * DAY_MS
  }
  return at
}

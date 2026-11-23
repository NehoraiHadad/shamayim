/**
 * Live correction: the IMS station network's current forecast anomaly around the place (Worker `/v1/live`), applied
 * to "now" and the next hours and fading with time. Held-out test at places without their own station
 * (research/verification/live_lapse.py, Gaussian 20 km): −10 % error now, −8 % an hour ahead, −3 % at 3 hours,
 * nothing useful beyond 12 hours. The decay slopes below are the ones fitted there.
 */
import type { CurrentWeather, HourPoint } from '../types'
import { atLead } from './table'

/** Hours after the stations measured, and how much of their anomaly to apply then. */
const DECAY_HOURS = [0, 1, 2, 3, 6, 12, 18] as const
const DECAY = [0.87, 0.782, 0.641, 0.521, 0.306, 0.151, 0] as const

export interface LiveAnomaly {
  /** Forecast − observed beyond the stations' usual error, °C (positive: the forecast is running warm). */
  anomaly: number
  /** When the stations measured, epoch ms. */
  observedAt: number
}

/** Share of the anomaly to remove `hours` after the measurement (none for hours long before it). */
export function liveDecay(hours: number): number {
  if (hours < -1) return 0
  return atLead(DECAY, Math.max(0, hours), DECAY_HOURS)
}

/** Epoch ms of Open-Meteo's local "YYYY-MM-DDTHH:MM" given the response's UTC offset. */
function epochOf(stamp: string, utcOffsetSeconds: number): number {
  const [date, time = '00:00'] = stamp.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return Date.UTC(y, m - 1, d, hh, mm) - utcOffsetSeconds * 1000
}

const round1 = (v: number) => Math.round(v * 10) / 10

/** Hours and the current reading with the live anomaly removed (the input is not changed). */
export function applyLive(
  current: CurrentWeather, hours: HourPoint[], live: LiveAnomaly | null, utcOffsetSeconds: number,
): { current: CurrentWeather; hours: HourPoint[] } {
  if (!live) return { current, hours }
  const shift = (stamp: string) =>
    -liveDecay((epochOf(stamp, utcOffsetSeconds) - live.observedAt) / 3600_000) * live.anomaly
  const now = shift(current.time)
  return {
    current: { ...current, temperature: round1(current.temperature + now), feelsLike: round1(current.feelsLike + now) },
    hours: hours.map((h) => {
      const s = shift(h.time)
      return s === 0 ? h : { ...h, temperature: round1(h.temperature + s) }
    }),
  }
}

/**
 * National temperature correction, measured against 84 IMS stations (research/verification/, report
 * results/temp-report.html). It applies to any place in the country, with or without a station nearby:
 *  - temperature blends ICON more heavily in the first days (ICON is the more accurate model there),
 *  - each hourly value gets the national bias for its lead, season and hour (mostly the too-cold afternoon),
 *  - the daily maximum gets the national bias of the day's peak (about +1 °C).
 * The daily minimum is left alone: its bias changes sign with terrain, and no national correction helped it.
 */
import { DAILY_MAX_ADD, HOURLY_ADD, LEAD_DAYS, SEASON_CENTRE_DOY } from './nationalTables'

/** ICON's share of the temperature blend by day offset (0 = today); other fields keep `iconWeight` (domain/blend). */
export function temperatureIconWeight(dayOffset: number): number {
  if (dayOffset <= 2) return 0.8
  if (dayOffset <= 4) return 0.6
  return 0.4
}

/** Linear interpolation of a per-lead value at `days` ahead (clamped to the measured leads). */
function atLead(values: readonly number[], days: number): number {
  const d = Math.min(Math.max(days, LEAD_DAYS[0]), LEAD_DAYS[LEAD_DAYS.length - 1])
  for (let i = 1; i < LEAD_DAYS.length; i++) {
    if (d <= LEAD_DAYS[i]) {
      const f = (d - LEAD_DAYS[i - 1]) / (LEAD_DAYS[i] - LEAD_DAYS[i - 1])
      return values[i - 1] * (1 - f) + values[i] * f
    }
  }
  return values[values.length - 1]
}

/** Weights of the four season centres for a day of year, linear between the two nearest (wrapping over New Year). */
function seasonWeights(doy: number): [number, number, number, number] {
  const w: [number, number, number, number] = [0, 0, 0, 0]
  const centres = SEASON_CENTRE_DOY
  for (let i = 0; i < 4; i++) {
    const a = centres[i]
    const b = i === 3 ? centres[0] + 365 : centres[i + 1]
    const d = doy < centres[0] ? doy + 365 : doy
    if (d >= a && d < b) {
      const f = (d - a) / (b - a)
      w[i] = 1 - f
      w[(i + 1) % 4] = f
      return w
    }
  }
  w[0] = 1
  return w
}

/** Parses Open-Meteo's local "YYYY-MM-DDTHH:MM" as naive wall-clock minutes (no time zone involved). */
function wallMinutes(stamp: string): number {
  const [date, time = '00:00'] = stamp.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return Date.UTC(y, m - 1, d, hh, mm) / 60000
}

function dayOfYear(stamp: string): number {
  const [y, m, d] = stamp.slice(0, 10).split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1
}

/**
 * Degrees to add to a blended hourly temperature valid at `time`, forecast at `now` (both local wall-clock strings
 * from the same response). `utcOffsetSeconds` is the response's offset; the tables are in Israel standard time.
 */
export function hourlyTemperatureAdd(time: string, now: string, utcOffsetSeconds: number): number {
  const days = Math.max(0, (wallMinutes(time) - wallMinutes(now)) / 1440)
  const localHour = Number(time.slice(11, 13))
  const hour = (((localHour - (utcOffsetSeconds / 3600 - 2)) % 24) + 24) % 24
  const sw = seasonWeights(dayOfYear(time))
  const perLead = HOURLY_ADD.map((season) => sw.reduce((sum, w, s) => sum + w * season[s][hour], 0))
  return atLead(perLead, days)
}

/** Degrees to add to the blended daily maximum `dayOffset` days ahead (0 = today). */
export function dailyMaxAdd(dayOffset: number): number {
  return atLead(DAILY_MAX_ADD, dayOffset)
}

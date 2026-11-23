/**
 * Reading the national correction tables (research/verification/build_correction*.py): each is
 * [lead][season][hour of Israel standard time], read smoothly between season centres and between measured leads.
 */
import { SEASON_CENTRE_DOY } from './nationalTables'

export type SeasonHourTable = readonly (readonly (readonly number[])[])[]

/** Linear interpolation of a per-lead value at `days` ahead, clamped to the measured leads. */
export function atLead(values: readonly number[], days: number, leadDays: readonly number[]): number {
  const d = Math.min(Math.max(days, leadDays[0]), leadDays[leadDays.length - 1])
  for (let i = 1; i < leadDays.length; i++) {
    if (d <= leadDays[i]) {
      const f = (d - leadDays[i - 1]) / (leadDays[i] - leadDays[i - 1])
      return values[i - 1] * (1 - f) + values[i] * f
    }
  }
  return values[values.length - 1]
}

/** Weights of the four season centres for a day of year, linear between the two nearest (wrapping over New Year). */
function seasonWeights(doy: number): [number, number, number, number] {
  const w: [number, number, number, number] = [0, 0, 0, 0]
  const centres = SEASON_CENTRE_DOY
  const d = doy < centres[0] ? doy + 365 : doy
  for (let i = 0; i < 4; i++) {
    const a = centres[i]
    const b = i === 3 ? centres[0] + 365 : centres[i + 1]
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

/** Open-Meteo's local "YYYY-MM-DDTHH:MM" as naive wall-clock minutes (no time zone involved). */
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

/** Days from `now` to `time` (local wall-clock strings of the same response); past hours count as 0. */
export function daysAhead(time: string, now: string): number {
  return Math.max(0, (wallMinutes(time) - wallMinutes(now)) / 1440)
}

/**
 * The table's value for an hour valid at `time`, forecast at `now`. `utcOffsetSeconds` is the response's offset;
 * the tables are in Israel standard time (UTC+2).
 */
export function readTable(table: SeasonHourTable, leadDays: readonly number[], time: string, now: string,
  utcOffsetSeconds: number): number {
  const localHour = Number(time.slice(11, 13))
  const hour = (((localHour - (utcOffsetSeconds / 3600 - 2)) % 24) + 24) % 24
  const sw = seasonWeights(dayOfYear(time))
  const perLead = table.map((season) => sw.reduce((sum, w, s) => sum + w * season[s][hour], 0))
  return atLead(perLead, daysAhead(time, now), leadDays)
}

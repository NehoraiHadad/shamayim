/**
 * National temperature correction, measured against 84 IMS stations (research/verification/, report
 * results/temp-report.html). It applies to any place in the country, with or without a station nearby:
 *  - temperature blends ICON more heavily in the first days (ICON is the more accurate model there),
 *  - each hourly value gets the national bias for its lead, season and hour (mostly the too-cold afternoon),
 *  - the daily maximum gets the national bias of the day's peak (about +1 °C).
 * The daily minimum is left alone: its bias changes sign with terrain, and no national correction helped it.
 */
import { DAILY_MAX_ADD, HOURLY_ADD, LEAD_DAYS } from './nationalTables'
import { atLead, readTable } from './table'

/** ICON's share of the temperature blend by day offset (0 = today); other fields keep `iconWeight` (domain/blend). */
export function temperatureIconWeight(dayOffset: number): number {
  if (dayOffset <= 2) return 0.8
  if (dayOffset <= 4) return 0.6
  return 0.4
}

/**
 * Degrees to add to a blended hourly temperature valid at `time`, forecast at `now` (both local wall-clock strings
 * from the same response). `utcOffsetSeconds` is the response's offset; the tables are in Israel standard time.
 */
export function hourlyTemperatureAdd(time: string, now: string, utcOffsetSeconds: number): number {
  return readTable(HOURLY_ADD, LEAD_DAYS, time, now, utcOffsetSeconds)
}

/** Degrees to add to the blended daily maximum `dayOffset` days ahead (0 = today). */
export function dailyMaxAdd(dayOffset: number): number {
  return atLead(DAILY_MAX_ADD, dayOffset, LEAD_DAYS)
}

/**
 * National gust and humidity corrections, measured against IMS stations (research/verification/verify_wind.py,
 * verify_rh.py, build_correction_more.py). Held-out stations in a held-out year: hourly gusts −5 to −7 %, daily maximum
 * gust −4 to −10 %, humidity −2 %. Mean wind speed is left alone (a national correction gained about 1 %).
 */
import { DAILY_GUST_SCALE, GUST_ADD, HUMIDITY_ADD } from './moreTables'
import { atLead, readTable } from './table'

const LEADS = [0, 1] as const

/** ICON's share of the humidity blend by day offset: ICON is the more accurate model for humidity too. */
export function humidityIconWeight(dayOffset: number): number {
  return dayOffset <= 2 ? 0.8 : 0.6
}

/** The blended hourly gust (km/h) corrected; never below the hour's mean wind. */
export function correctGust(gust: number, windSpeed: number, time: string, now: string, utcOffsetSeconds: number): number {
  return Math.max(windSpeed, gust + readTable(GUST_ADD, LEADS, time, now, utcOffsetSeconds))
}

/** The blended daily maximum gust (km/h) `dayOffset` days ahead, corrected. */
export function correctDailyGust(gust: number, dayOffset: number): number {
  return gust * atLead(DAILY_GUST_SCALE, dayOffset, LEADS)
}

/** The blended relative humidity (%) corrected, kept within 0–100. */
export function correctHumidity(rh: number, time: string, now: string, utcOffsetSeconds: number): number {
  return Math.min(100, Math.max(0, rh + readTable(HUMIDITY_ADD, LEADS, time, now, utcOffsetSeconds)))
}

import type { CurrentWeather, DayPoint, HourPoint, NowcastPoint } from '../../domain/types'
import { num, numOrNull, obj, str } from './guards'
import { mapCurrent } from './mapCurrent'
import { mapDays } from './mapDays'
import { mapHours } from './mapHours'
import { mapNowcast } from './mapNowcast'

export interface MappedForecast {
  elevation: number
  current: CurrentWeather
  hours: HourPoint[]
  days: DayPoint[]
  nowcast: NowcastPoint[] | null
  /** The response's offset from UTC (Israel: 7200 in winter, 10800 in summer). */
  utcOffsetSeconds: number
}

export function mapForecast(input: unknown, { calibrateClouds = true } = {}): MappedForecast {
  const raw = obj(input, 'forecast')
  const elevation = num(raw.elevation, 'elevation')
  const time = str(obj(raw.current, 'current').time, 'current.time')
  const today = time.slice(0, 10)

  if (elevation < -250 || elevation > -100) {
    console.warn(`[shamayim] unexpected elevation ${elevation} m for a Jordan Valley point`)
  }

  // Israel: +2 h in winter, +3 h in summer. Absent (an older cached copy), assume standard time.
  const utcOffsetSeconds = numOrNull(raw.utc_offset_seconds) ?? 7200
  const { hours, observedDirections, ecmwfCloud, adjustmentAtCurrent } =
    mapHours(raw, today, time, utcOffsetSeconds, calibrateClouds)
  const current = mapCurrent(raw, observedDirections, ecmwfCloud, adjustmentAtCurrent)
  return {
    elevation, current, hours, days: mapDays(raw, today), nowcast: mapNowcast(raw),
    utcOffsetSeconds,
  }
}

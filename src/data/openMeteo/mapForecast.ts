import type { CurrentWeather, DayPoint, HourPoint } from '../../domain/types'
import { num, obj } from './guards'
import { mapCurrent } from './mapCurrent'
import { mapDays } from './mapDays'
import { mapHours } from './mapHours'

export interface MappedForecast {
  elevation: number
  current: CurrentWeather
  hours: HourPoint[]
  days: DayPoint[]
}

export function mapForecast(input: unknown): MappedForecast {
  const raw = obj(input, 'forecast')
  const elevation = num(raw.elevation, 'elevation')
  const current = mapCurrent(raw)
  const today = current.time.slice(0, 10)

  if (elevation < -250 || elevation > -100) {
    console.warn(`[shamayim] unexpected elevation ${elevation} m for a Jordan Valley point`)
  }

  return { elevation, current, hours: mapHours(raw, today), days: mapDays(raw, today) }
}

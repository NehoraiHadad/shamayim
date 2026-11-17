import { minutesBetween } from '../../domain/time'
import type { DayPoint, LocalTime } from '../../domain/types'

export interface SunEvent {
  rise: boolean
  time: LocalTime
}

/** The next sunrise or sunset after `now` (by day the sunset, at night the coming sunrise). */
export function nextSunEvent(days: DayPoint[], now: LocalTime): SunEvent | null {
  for (const d of days) {
    if (d.sunrise > now) return { rise: true, time: d.sunrise }
    if (d.sunset > now) return { rise: false, time: d.sunset }
  }
  return null
}

export interface Twilight {
  /** Which ridge the light sits behind: east before sunrise, west after sunset. */
  side: 'east' | 'west'
  /** 0 to 0.5 */
  opacity: number
}

const PRE_DAWN_MIN = 60
const AFTERGLOW_MIN = 25

/** Light behind the ridge in the hour before sunrise and the minutes after sunset. */
export function twilight(day: DayPoint | undefined, now: LocalTime): Twilight | null {
  if (!day) return null
  const toRise = minutesBetween(now, day.sunrise)
  if (toRise > 0 && toRise <= PRE_DAWN_MIN) {
    return { side: 'east', opacity: 0.5 * (1 - toRise / PRE_DAWN_MIN) }
  }
  const sinceSet = minutesBetween(day.sunset, now)
  if (sinceSet >= 0 && sinceSet <= AFTERGLOW_MIN) {
    return { side: 'west', opacity: 0.5 * (1 - sinceSet / AFTERGLOW_MIN) }
  }
  return null
}

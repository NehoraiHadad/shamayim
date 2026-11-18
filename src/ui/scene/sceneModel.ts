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

/** Minutes the glow builds before, and fades after, each event (it peaks as the sun meets the ridge). */
const RISE_RAMP = { before: 60, after: 20 }
const SET_RAMP = { before: 20, after: 35 }

/** 0..1, rising linearly to 1 at the event and back to 0, so the glow never pops on or off. */
function ramp(sinceEvent: number, { before, after }: { before: number; after: number }): number {
  if (sinceEvent < -before || sinceEvent > after) return 0
  return sinceEvent <= 0 ? 1 + sinceEvent / before : 1 - sinceEvent / after
}

/** Light behind the ridge around sunrise (east) and sunset (west), peaking as the sun touches the ridge. */
export function twilight(day: DayPoint | undefined, now: LocalTime): Twilight | null {
  if (!day) return null
  const east = ramp(minutesBetween(day.sunrise, now), RISE_RAMP)
  const west = ramp(minutesBetween(day.sunset, now), SET_RAMP)
  if (east <= 0 && west <= 0) return null
  return east >= west ? { side: 'east', opacity: 0.5 * east } : { side: 'west', opacity: 0.5 * west }
}

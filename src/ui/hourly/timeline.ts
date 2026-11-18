import { THRESHOLDS as T } from '../../config/thresholds'
import { conditionOf, type ConditionKind } from '../../domain/conditions'
import { datePart, hourOf } from '../../domain/time'
import type { DayPoint, Forecast, LocalTime } from '../../domain/types'

export interface HourSlot {
  type: 'hour'
  time: LocalTime
  temp: number
  kind: ConditionKind
  isDay: boolean
  /** Rain chance worth showing (≥ showRainProb), otherwise null. */
  prob: number | null
  /** Mean wind, km/h. */
  wind: number
  isNow: boolean
}

export interface SunSlot {
  type: 'sun'
  time: LocalTime
  rise: boolean
}

export type TimelineSlot = HourSlot | SunSlot

function isDaylight(time: LocalTime, days: DayPoint[]): boolean {
  const day = days.find((d) => d.date === datePart(time))
  if (!day) return true
  const hourEnd = `${time.slice(0, 13)}:59`
  return hourEnd >= day.sunrise && time < day.sunset
}

/**
 * Hourly slots in [from, to) (from is floored to its hour), every `stepHours`,
 * with sunrise/sunset markers inserted where they fall.
 */
export function buildTimeline(
  f: Forecast,
  from: LocalTime,
  to: LocalTime,
  now: LocalTime,
  stepHours = 1,
): TimelineSlot[] {
  const startKey = `${from.slice(0, 13)}:00`
  const nowKey = `${now.slice(0, 13)}:00`
  const hours = f.hours.filter(
    (h) => h.time >= startKey && h.time < to && hourOf(h.time) % stepHours === 0,
  )
  const slots: TimelineSlot[] = hours.map((h) => {
    const prob = h.precipProb ?? 0
    return {
      type: 'hour',
      time: h.time,
      temp: h.time === nowKey ? f.current.temperature : h.temperature,
      kind: conditionOf(h.time === nowKey ? f.current.weatherCode : h.weatherCode),
      isDay: isDaylight(h.time, f.days),
      prob: prob >= T.showRainProb ? prob : null,
      wind: h.time === nowKey ? f.current.windSpeed : h.windSpeed,
      isNow: h.time === nowKey,
    }
  })
  for (const d of f.days) {
    // The times the sun is really seen to rise and set over the land around, when known.
    for (const [time, rise] of [[d.visibleSunrise ?? d.sunrise, true], [d.visibleSunset ?? d.sunset, false]] as const) {
      if (time <= from || time >= to) continue
      const at = slots.findIndex((s) => s.time > time)
      if (at <= 0) continue
      slots.splice(at, 0, { type: 'sun', time, rise })
    }
  }
  return slots
}

/** Window that starts at the current hour and spans the next 24 hours. */
export function next24h(f: Forecast, now: LocalTime): TimelineSlot[] {
  const idx = f.hours.findIndex((h) => h.time >= `${now.slice(0, 13)}:00`)
  const end = f.hours[Math.min(f.hours.length - 1, Math.max(0, idx) + 25)]?.time ?? now
  return buildTimeline(f, now, end, now)
}

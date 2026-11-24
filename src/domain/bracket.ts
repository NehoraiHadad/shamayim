import { addMinutes, minutesBetweenLocal } from './minutes'
import type { HourPoint, LocalTime } from './types'

/** Bracket the viewed minute, holding the nearest sample outside the available range. */
export function bracketAt<T extends { time: LocalTime }>(points: readonly T[], at: LocalTime) {
  const following = points.findIndex((point) => point.time > at)
  const before = following < 0 ? points.at(-1) : points[Math.max(0, following - 1)]
  const after = following > 0 ? points[following] : undefined
  const fraction = before && after ? minutesBetweenLocal(before.time, at) / minutesBetweenLocal(before.time, after.time) : 0
  return { before, after, fraction }
}

/** Provider sums and maxima describe the preceding 60 minutes; anchor them at the interval centre. */
export function precedingHourAt<T extends { time: LocalTime }>(points: readonly T[], at: LocalTime) {
  return bracketAt(points, addMinutes(at, 30))
}

/** The closest reported direction, with the earlier hour winning a tie. */
export function nearestWindDirection(hours: readonly Pick<HourPoint, 'time' | 'windDirection'>[], at: LocalTime): number | null {
  let direction: number | null = null
  let distance = Infinity
  for (const hour of hours) {
    if (hour.windDirection == null) continue
    const minutes = Math.abs(minutesBetweenLocal(hour.time, at))
    if (minutes >= distance) continue
    direction = hour.windDirection
    distance = minutes
  }
  return direction
}

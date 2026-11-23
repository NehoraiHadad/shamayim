import { minutesBetweenLocal } from './minutes'
import type { LocalTime } from './types'

/** Bracket the viewed minute, holding the nearest sample outside the available range. */
export function bracketAt<T extends { time: LocalTime }>(points: readonly T[], at: LocalTime) {
  const following = points.findIndex((point) => point.time > at)
  const before = following < 0 ? points.at(-1) : points[Math.max(0, following - 1)]
  const after = following > 0 ? points[following] : undefined
  const fraction = before && after ? minutesBetweenLocal(before.time, at) / minutesBetweenLocal(before.time, after.time) : 0
  return { before, after, fraction }
}

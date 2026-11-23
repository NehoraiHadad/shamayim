import { addMinutes } from '../../domain/minutes'
import type { LocalTime } from '../../domain/types'

/** Minutes of the day per px of finger travel: a thumb's sweep across the valley covers about a day. */
const MIN_PER_PX = 4

export interface SceneDrag {
  x: number
  at: LocalTime | null
  moved: boolean
}

export function sceneDragTime(drag: SceneDrag, x: number, now: LocalTime, first: LocalTime, last: LocalTime) {
  if (x === drag.x) return drag.moved ? drag.at ?? now : undefined
  const time = addMinutes(drag.at ?? now, (drag.x - x) * MIN_PER_PX)
  return time < first ? first : time > last ? last : time
}

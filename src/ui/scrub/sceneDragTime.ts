import { addMinutes, minutesBetweenLocal } from '../../domain/minutes'
import type { LocalTime } from '../../domain/types'

/** Minutes of the day per px of finger travel: a thumb's sweep across the valley covers about a day. */
const MIN_PER_PX = 4
const DRAG_SLOP_PX = 8

/** Lock to the initial direction once the gesture is large enough to distinguish from finger drift. */
export function sceneDragIntent(dx: number, dy: number): 'horizontal' | 'vertical' | undefined {
  const across = Math.abs(dx)
  const down = Math.abs(dy)
  if (Math.max(across, down) < DRAG_SLOP_PX) return undefined
  return across > 1.5 * down ? 'horizontal' : 'vertical'
}

export interface SceneDrag {
  x: number
  at: LocalTime | null
  moved: boolean
}

export function sceneDragTime(drag: SceneDrag, x: number, now: LocalTime, first: LocalTime, last: LocalTime) {
  const dx = drag.x - x
  const travel = Math.max(0, Math.abs(dx) - DRAG_SLOP_PX)
  if (travel === 0) return drag.moved ? drag.at ?? now : undefined
  const time = addMinutes(drag.at ?? now, Math.sign(dx) * travel * MIN_PER_PX)
  // Half a px from now is now: its minute may fall between two of the drag's steps.
  if (Math.abs(minutesBetweenLocal(time, now)) <= MIN_PER_PX / 2) return now
  return time < first ? first : time > last ? last : time
}

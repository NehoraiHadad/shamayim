import { KIND_REPEAT_PENALTY, nearLimit } from '../data/landmarks/rank'
import { overlaps, type Box } from './layout'
import type { SeatedWorldMark } from './markGeometry'
import { SCENE_W } from './sceneBox'

/** Maximum beyond seats per settlement kind, extending the landmark ranker's two-minaret cap to every kind. */
const BEYOND_KIND_CAP = 2
/** Minimum gap in px between seated glyph boxes, from the world seating budget. */
const SEAT_GAP_PX = 1

/** Apply the world-width budget using glyph bounds in the caller's layout or screen coordinates. */
export function budgetSeated<T extends { mark: SeatedWorldMark; bounds: Box }>(viable: readonly T[]): T[] {
  const limit = nearLimit(SCENE_W)
  const pool = [...viable]
  const chosen: T[] = []
  const counts = new Map<SeatedWorldMark['kind'], number>()
  const value = ({ mark }: T) => mark.seatRank - KIND_REPEAT_PENALTY * (counts.get(mark.kind) ?? 0)
  while (chosen.length < limit && pool.length) {
    pool.sort((a, b) => value(b) - value(a))
    const next = pool.shift()!
    const count = counts.get(next.mark.kind) ?? 0
    if (count >= BEYOND_KIND_CAP || chosen.some((other) => overlaps(next.bounds, other.bounds, SEAT_GAP_PX))) continue
    chosen.push(next)
    counts.set(next.mark.kind, count + 1)
  }
  return chosen
}

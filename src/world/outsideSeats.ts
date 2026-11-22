import { fitsBlockSpan } from './beyondSeat'
import { markBoxAt, type WorldMark } from './markGeometry'
import { SCENE_W } from './sceneBox'
import { heightLabelBox, hits, type ScreenBox } from './sceneClearance'
import { budgetSeated } from './seatBudget'
import type { WorldState } from './types'

/** The span of a drawn town block in screen px. */
export interface TownBlockSpan { x: number; w: number }

/** Screen bounds used to clear both ordinary and seated outside glyphs. */
export function visibleOutsideMark<T extends WorldMark>(mark: T, x: number, clear: readonly ScreenBox[]) {
  const bounds = { ...markBoxAt(mark, x), top: mark.base - mark.h * mark.scale }
  const { left, top, right, bottom } = bounds
  return hits(clear, left, top, right, bottom) ? [] : [{ mark, x, bounds }]
}

/** Select from the full pool only after block containment and all glyph clearance checks. */
export function finalSeats(world: Pick<WorldState, 'labels' | 'seatPool'>, width: number,
  blocks: ReadonlyMap<string, TownBlockSpan>, clear: readonly ScreenBox[]) {
  const sx = width / SCENE_W
  const { height } = world.labels
  const zones = height.backed ? [...clear, heightLabelBox(height, width)] : clear
  return budgetSeated(world.seatPool.flatMap((mark) => {
    const block = blocks.get(mark.seatBlockId)
    const x = mark.x * sx
    if (!block || !fitsBlockSpan(x, mark.w / 2, block.x, block.w)) return []
    return visibleOutsideMark(mark, x, zones)
  }))
}

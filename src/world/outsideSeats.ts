import { markBoxAt, type WorldMark } from './markGeometry'
import { hits, type ScreenBox } from './sceneClearance'

export function visibleOutsideMark<T extends WorldMark>(mark: T, x: number, clear: readonly ScreenBox[]) {
  const bounds = markBoxAt(mark, x)
  const { left, right, bottom } = bounds
  // Restore the legacy clearance above field rows for the dot and notes.
  const top = mark.base - mark.h * mark.scale
  return hits(clear, left, top, right, bottom) ? [] : [{ mark, x, bounds }]
}

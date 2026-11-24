import { markBoxAt, type WorldMark } from './markGeometry'
import { hits, type ScreenBox } from './sceneClearance'

/** Screen bounds shared by badge scoring and outside glyph clearance. */
export function outsideMarkBounds(mark: WorldMark, x: number) {
  return markBoxAt(mark, x)
}

export function visibleOutsideMark<T extends WorldMark>(mark: T, x: number, clear: readonly ScreenBox[]) {
  const bounds = outsideMarkBounds(mark, x)
  const { left, top, right, bottom } = bounds
  return hits(clear, left, top, right, bottom) ? [] : [{ mark, x, bounds }]
}

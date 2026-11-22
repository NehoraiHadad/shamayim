import { markBoxAt, type WorldMark } from './markGeometry'
import { hits, type ScreenBox } from './sceneClearance'

/** Screen bounds used to clear both ordinary and seated outside glyphs. */
export function visibleOutsideMark<T extends WorldMark>(mark: T, x: number, clear: readonly ScreenBox[]) {
  const bounds = { ...markBoxAt(mark, x), top: mark.base - mark.h * mark.scale }
  const { left, top, right, bottom } = bounds
  return hits(clear, left, top, right, bottom) ? [] : [{ mark, x, bounds }]
}

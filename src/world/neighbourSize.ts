import { glyphAtHeight, type GlyphKind } from './glyphSpecs'
import { LEGIBLE_PX, MAX_EXAGGERATION, neighbourRule } from './neighbourPolicy'
export { LEGIBLE_PX, MAX_EXAGGERATION, NEIGHBOUR_MIN_TRUE_PX } from './neighbourPolicy'

/** Six CSS px give 12 DPR-2 rows: the church's 15.5-unit tower and castle's 9.5-unit body remain distinct. */
export const LANDMARK_MIN_PX = 6
/** Shrinks true heights above 16 too. One eighth of the 128 px land band keeps an icon secondary to the
 * home roofline group at 375 px, rather than letting a tall distant building become a foreground skyline. */
export const LANDMARK_MAX_PX = 16

/** Ordinary neighbours keep the four-CSS-pixel floor and 2× cap; famous icons use the bounded policy above. */
export function neighbourSize(kind: GlyphKind, trueHeightPx: number, famous = false) {
  const rule = neighbourRule(kind, famous)
  if (rule === 'hidden' || !(trueHeightPx > 0)) return null
  const drawnHeight = rule === 'landmark'
    ? Math.min(LANDMARK_MAX_PX, Math.max(LANDMARK_MIN_PX, trueHeightPx)) : Math.max(trueHeightPx, LEGIBLE_PX)
  const factor = drawnHeight / trueHeightPx
  if (rule !== 'landmark' && factor > MAX_EXAGGERATION) return null
  const source = glyphAtHeight(kind, trueHeightPx)
  const geometry = rule === 'landmark'
    ? { h: source.h, scale: drawnHeight / source.h, w: source.w * factor } : glyphAtHeight(kind, drawnHeight)
  return { ...geometry, trueHeightPx, factor }
}

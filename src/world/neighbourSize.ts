import { glyphAtHeight, type GlyphKind } from './glyphSpecs'
import { LEGIBLE_PX, MAX_EXAGGERATION, neighbourRule } from './neighbourPolicy'
export { LEGIBLE_PX, MAX_EXAGGERATION, NEIGHBOUR_MIN_TRUE_PX } from './neighbourPolicy'

/** Four CSS px give eight DPR-2 rows for the specs' minaret/cone and hall/dome silhouettes. */
export function neighbourSize(kind: GlyphKind, trueHeightPx: number, famous = false) {
  const rule = neighbourRule(kind, famous)
  if (rule === 'hidden' || !(trueHeightPx > 0)) return null
  const drawnHeight = Math.max(trueHeightPx, LEGIBLE_PX)
  const factor = drawnHeight / trueHeightPx
  if (rule !== 'landmark' && factor > MAX_EXAGGERATION) return null
  return { ...glyphAtHeight(kind, drawnHeight), trueHeightPx, factor }
}

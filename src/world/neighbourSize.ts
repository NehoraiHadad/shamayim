import { glyphAtHeight, type GlyphKind } from './glyphSpecs'

/** At DPR 2, four CSS px provide eight raster rows: the specs' hall/dome and minaret/cone remain distinct.
 * GLYPH_SPECS uses 17 units for a minaret and 9.5 for a synagogue; one CSS px loses both silhouettes. */
export const LEGIBLE_PX = 4
/** At most twice the physical visible height: the owner's bounded departure from truth, shared by every kind. */
export const MAX_EXAGGERATION = 2
/** Earliest viability floor: no candidate below it can survive the bounded display exaggeration. */
export const NEIGHBOUR_MIN_TRUE_PX = LEGIBLE_PX / MAX_EXAGGERATION

export function neighbourSize(kind: GlyphKind, trueHeightPx: number) {
  if (!(trueHeightPx > 0)) return null
  const drawnHeight = Math.max(trueHeightPx, LEGIBLE_PX)
  const factor = drawnHeight / trueHeightPx
  if (factor > MAX_EXAGGERATION) return null
  return { ...glyphAtHeight(kind, drawnHeight), trueHeightPx, factor }
}

import type { PlacedMark } from '../data/landmarks/types'
import type { GlyphKind } from './glyphSpecs'
import type { Box } from './layout'

/** A placed mark, its glyph, and where it stands in scene px at the layout width. */
interface MarkGeometry extends PlacedMark {
  factor?: number
  trueHeightPx?: number
  glyphKind: GlyphKind
  /** Centre x and base y (px). */
  x: number
  base: number
  /** Height in glyph px and px per glyph px. Non-owned marks use angular height, portrait far marks use 0.6. */
  h: number
  scale: number
  /** Box width (px, after scale). */
  w: number
  /** A field: px under the crest its first row lies (its rows follow the ground). */
  depth?: number
  /** How far (km) it stands: the haze it takes. */
  km: number
  plane: 'near' | 'far' | 'plain'
  /** Own: portrait landmark class. Non-own: only named fame-2 or curated, from isFamousLandmark. */
  named: boolean
}

/** A beyond seat carries the supporting raster block id and the landmark score used by the final display budget. */
export type SeatedWorldMark = MarkGeometry & { seatBlockId: string; seatRank: number }
export type WorldMark = SeatedWorldMark | (MarkGeometry & { seatBlockId?: undefined; seatRank?: undefined })

/** The box a placed mark covers (px), for the world layout's label and portrait. */
export function markBox(mark: WorldMark): Box {
  return markBoxAt(mark, mark.x)
}

/** The same glyph bounds (px) at the mark's final screen x. */
export function markBoxAt(mark: WorldMark, x: number): Box {
  if (mark.depth !== undefined) {
    return { left: x - mark.w / 2, right: x + mark.w / 2, top: mark.base - 1.6, bottom: mark.base + mark.h }
  }
  return { left: x - mark.w / 2, right: x + mark.w / 2, top: mark.base - mark.h * mark.scale, bottom: mark.base }
}

import type { MarkKind } from '../data/landmarks/types'

/**
 * The glyphs' sizes in scene px (stage C4): a box width and the drawn height from the mark's projected height, per
 * generic kind and per hand-drawn icon. The same numbers as the SVG scene's `generic/buildingSpecs.ts` and
 * `curated/index.ts` had (deleted at C9), so the marks stand where they stood; the painters
 * (`scene/paint/glyphs`, `scene/paint/icons`) draw in this box.
 */
export type IconKind = 'westernWall' | 'babShrine' | 'azrieli' | 'chordsBridge'
export type GlyphKind = Exclude<MarkKind, 'custom'> | IconKind

export interface GlyphSpec {
  w: number
  h: (hPx: number) => number
  /** A patch on the ground under the crest (orchard, vineyard, solar), not a building on it. */
  field?: boolean
}

const at = (min: number) => (hPx: number) => Math.max(min, hPx)
const fixed = (h: number) => () => h

export const GLYPH_SPECS: Record<GlyphKind, GlyphSpec> = {
  minaret: { w: 14, h: at(17) },
  synagogue: { w: 11, h: fixed(9.5) },
  church: { w: 12, h: fixed(15.5) },
  waterTower: { w: 9, h: at(16) },
  castle: { w: 16, h: fixed(9.5) },
  highrise: { w: 10, h: at(14) },
  chimney: { w: 9, h: at(16) },
  cooling: { w: 12, h: fixed(14) },
  silo: { w: 13, h: at(14) },
  turbine: { w: 4, h: at(16) },
  mast: { w: 5, h: at(14) },
  lighthouse: { w: 9, h: at(14) },
  bridge: { w: 24, h: at(14) },
  palms: { w: 12, h: at(11) },
  homes: { w: 12, h: (hPx) => Math.max(6, Math.min(14, hPx)) },
  orchard: { w: 22, h: fixed(6), field: true },
  vineyard: { w: 20, h: fixed(5), field: true },
  solar: { w: 18, h: fixed(3), field: true },
  westernWall: { w: 18, h: fixed(9) },
  babShrine: { w: 12, h: at(16) },
  azrieli: { w: 19, h: at(24) },
  chordsBridge: { w: 20, h: at(22) },
}

/** The hand-drawn icons by their landmark's glyph (`data/landmarks/curated.ts`). */
export const ICON_OF: Record<string, IconKind> = {
  'jerusalem-wall': 'westernWall', 'haifa-bab': 'babShrine', 'tel-aviv-azrieli': 'azrieli', 'jerusalem-bridge': 'chordsBridge',
}

/** The glyph a mark is drawn with: its icon, else its kind (a `custom` mark without an icon has none). */
export function glyphOf(mark: { kind: MarkKind; glyph?: string }): GlyphKind | null {
  const icon = mark.glyph ? ICON_OF[mark.glyph] : undefined
  if (icon) return icon
  return mark.kind === 'custom' ? null : mark.kind
}

export const isIcon = (kind: GlyphKind): kind is IconKind => kind in ICON_KINDS
const ICON_KINDS: Record<IconKind, true> = { westernWall: true, babShrine: true, azrieli: true, chordsBridge: true }

/** How far a field's lowest row reaches below its depth (px). */
export function fieldReach(kind: GlyphKind) { return kind === 'solar' ? 5.9 : kind === 'vineyard' ? 6.5 : 7.3 }

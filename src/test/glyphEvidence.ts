import type { GlyphDesc } from '../scene/model/types'

/** Owned/test glyphs use their supplied geometry without neighbour exaggeration. */
export const OWN_GLYPH_EVIDENCE = { factor: 1 } satisfies Pick<GlyphDesc, 'factor'>

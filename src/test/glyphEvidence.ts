import type { RGB } from '../world/types'
import type { Tones } from '../scene/model/types'
import type { GlyphDesc } from '../scene/model/types'

/** Owned/test glyphs use their supplied geometry without neighbour exaggeration. */
export const OWN_GLYPH_EVIDENCE = { factor: 1 } satisfies Pick<GlyphDesc, 'factor'>

/** Explicit receiver samples for isolated painter tests that have no world model. */
export function glyphPaintEvidence(tones: Tones, side = 0) {
  const lateral = (a: RGB, b: RGB, k: number): RGB =>
    [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
  const left = lateral(tones.wall, side < 0 ? tones.shade : tones.lit, Math.abs(side))
  const right = lateral(tones.wall, side < 0 ? tones.lit : tones.shade, Math.abs(side))
  return {
    surfaces: { wall: [left, right] as const, stone: [left, right] as const, glass: [left, right] as const,
      tile: [left, right] as const, round: [left, tones.wall, right], roundGlass: [left, tones.glass, right],
      eave: tones.shade, silver: tones.rim, band: tones.glass },
    gilding: Array.from({ length: 4 }, () => [left, left, left, tones.rim, right, right, right]),
  }
}

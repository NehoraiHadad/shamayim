import { expect, it } from 'vitest'
import { GLYPH_SPECS, type GlyphKind } from './glyphSpecs'
import { LEGIBLE_PX, MAX_EXAGGERATION, NEIGHBOUR_MIN_TRUE_PX, neighbourSize } from './neighbourSize'

it.each(Object.keys(GLYPH_SPECS) as GlyphKind[])('applies the same legibility floor and cap to %s', kind => {
  const hidden = ['minaret', 'church', 'synagogue', 'westernWall', 'babShrine'].includes(kind)
  for (const height of [NEIGHBOUR_MIN_TRUE_PX, (NEIGHBOUR_MIN_TRUE_PX + LEGIBLE_PX) / 2, LEGIBLE_PX, LEGIBLE_PX * 2]) {
    const size = neighbourSize(kind, height)!
    if (hidden) { expect(size).toBeNull(); continue }
    expect(size.h * size.scale).toBeCloseTo(Math.max(LEGIBLE_PX, height), 8)
    expect(size.factor).toBe(Math.max(LEGIBLE_PX, height) / height)
    expect(size.factor).toBeLessThanOrEqual(MAX_EXAGGERATION)
    expect(size.w).toBeCloseTo(GLYPH_SPECS[kind].w * size.scale, 8)
  }
  for (const height of [0, -1, NEIGHBOUR_MIN_TRUE_PX / 2, NEIGHBOUR_MIN_TRUE_PX - 1e-6]) expect(neighbourSize(kind,
    height)).toBeNull()
})

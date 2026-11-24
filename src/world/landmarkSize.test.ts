import { expect, it } from 'vitest'
import { GLYPH_SPECS, glyphAtHeight, type GlyphKind } from './glyphSpecs'
import { LANDMARK_MIN_PX, LANDMARK_MAX_PX, neighbourSize } from './neighbourSize'

const kinds = (Object.keys(GLYPH_SPECS) as GlyphKind[])
  .filter(k => !['palms', 'orchard', 'vineyard', 'solar', 'mast', 'homes'].includes(k))
it.each(kinds)('clamps the famous %s in CSS pixels and scales both dimensions by its recorded factor', kind => {
  for (const trueHeight of [.01, .8, 4, 5.99, 6, 8, 16, 16.01, 32, 250]) {
    const sized = neighbourSize(kind, trueHeight, true)!
    const expected = Math.min(16, Math.max(6, trueHeight)), source = glyphAtHeight(kind, trueHeight)
    expect(sized.h * sized.scale).toBeCloseTo(expected, 9)
    expect(sized.factor).toBeCloseTo(expected / trueHeight, 10)
    expect(sized.w).toBeCloseTo(source.w * sized.factor, 10)
    if (trueHeight >= 6 && trueHeight <= 16) expect(sized.factor).toBe(1)
  }
})
it('keeps one product floor and ceiling and positive physical visibility', () => {
  expect(LANDMARK_MIN_PX).toBe(6)
  expect(LANDMARK_MAX_PX).toBe(16)
  expect(neighbourSize('church', 0, true)).toBeNull()
  expect(neighbourSize('castle', 1, false)).toBeNull()
  expect(neighbourSize('castle', 3, false)!.h * neighbourSize('castle', 3, false)!.scale).toBe(4)
})

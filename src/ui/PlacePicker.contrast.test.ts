import { describe, expect, it } from 'vitest'
import { contrast, mix, rgb } from '../test/contrast'
import { SKY_THEMES } from '../theme/skyThemes'

const WHITE = rgb('#FFFFFF')

/** Mirrors PlacePicker.module.css: a dark sky surface, ink text, wells and borders mixed from ink. */
describe('place picker contrast (WCAG AA)', () => {
  for (const [id, t] of Object.entries(SKY_THEMES)) {
    const ink = rgb(t.ink)
    const top = rgb(t.top)
    const panel = mix(top, WHITE, 0.92)
    const well = mix(ink, panel, 0.1)
    it(`${id}: text on the panel ≥ 4.5`, () => expect(contrast(ink, panel)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: text in a well or hovered row ≥ 4.5`, () => expect(contrast(ink, well)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: text in the input ≥ 4.5`, () => expect(contrast(ink, top)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: placeholder ≥ 4.5`, () => expect(contrast(mix(ink, top, 0.8), top)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: borders ≥ 3`, () => expect(contrast(mix(ink, panel, 0.55), panel)).toBeGreaterThanOrEqual(3))
  }
})

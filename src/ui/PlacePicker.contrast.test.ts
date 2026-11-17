import { describe, expect, it } from 'vitest'
import { mix, ratio } from '../theme/contrast'
import { SKY_THEMES } from '../theme/skyThemes'

/** Like CSS `color-mix(in srgb, a share%, b)`. */
const over = (a: string, b: string, share: number) => mix(b, a, share)

/** Mirrors PlacePicker.module.css: a dark sky surface, ink text, wells and borders mixed from ink. */
describe('place picker contrast (WCAG AA)', () => {
  for (const [id, t] of Object.entries(SKY_THEMES)) {
    const panel = over(t.top, '#FFFFFF', 0.92)
    const well = over(t.ink, panel, 0.1)
    it(`${id}: text on the panel ≥ 4.5`, () => expect(ratio(t.ink, panel)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: text in a well or hovered row ≥ 4.5`, () => expect(ratio(t.ink, well)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: text in the input ≥ 4.5`, () => expect(ratio(t.ink, t.top)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: placeholder ≥ 4.5`, () => expect(ratio(over(t.ink, t.top, 0.8), t.top)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: borders ≥ 3`, () => expect(ratio(over(t.ink, panel, 0.55), panel)).toBeGreaterThanOrEqual(3))
  }
})

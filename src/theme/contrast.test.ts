import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cssTokens, mix, ratio } from './contrast'
import { contrastSamples } from './contrastSamples'
import { DARK_SHEET, SKY_THEMES, type ThemeId } from './skyThemes'

const css = readFileSync(new URL('../ui/tokens.css', import.meta.url), 'utf8')
const lightTokens = cssTokens(css, ':root')
const darkTokens = { ...lightTokens, ...cssTokens(css, '.dark-sheet') }
const sheetToken = (id: string, name: string) => (DARK_SHEET.has(id as ThemeId) ? darkTokens : lightTokens)[name]

/** All sky text sits on `top` or `mid` (the light horizon is only behind the valley scene). */
describe('sky theme contrast (WCAG AA)', () => {
  for (const [id, t] of Object.entries(SKY_THEMES)) {
    it(`${id}: ink on top sky ≥ 4.5`, () => expect(ratio(t.ink, t.top)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: ink on mid sky ≥ 4.5`, () => expect(ratio(t.ink, t.mid)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: sheet text ≥ 4.5`, () => expect(ratio(t.sheetInk, t.sheet)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: sheet muted ≥ 4.5`, () => expect(ratio(t.sheetMuted, t.sheet)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: sheet accent ≥ 4.5`, () => expect(ratio(t.sheetAccent, t.sheet)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: rain % on mid sky ≥ 4.5`, () => expect(ratio(lightTokens['--sky-rain'], t.mid)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: rain % on paper ≥ 4.5`, () => expect(ratio(sheetToken(id, '--sheet-rain'), t.sheet)).toBeGreaterThanOrEqual(4.5))
    it(`${id}: sun times on paper ≥ 4.5`, () => expect(ratio(sheetToken(id, '--sheet-sun'), t.sheet)).toBeGreaterThanOrEqual(4.5))
  }
})

describe('shared control contrast (WCAG AA)', () => {
  for (const [id, t] of Object.entries(SKY_THEMES)) {
    it(`${id}: warning text on its pill ≥ 4.5`, () => {
      for (const sky of [t.top, t.mid]) {
        const pill = mix(sky, lightTokens['--warn'], 0.7)
        expect(ratio(t.ink, pill)).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  for (const { name, sky, paper } of contrastSamples) {
    it(`${name}: error button text on accent ≥ 4.5`, () => {
      expect(ratio(lightTokens['--on-accent'], sky.accent)).toBeGreaterThanOrEqual(4.5)
    })

    it(`${name}: focus on sky, picker and paper ≥ 3`, () => {
      // PlacePicker.module.css uses 92% sky top and 8% white.
      const panel = mix(sky.top, '#FFFFFF', 0.08)
      expect(ratio(sky.ink, sky.top), 'sky top').toBeGreaterThanOrEqual(3)
      expect(ratio(sky.ink, sky.mid), 'sky mid').toBeGreaterThanOrEqual(3)
      expect(ratio(sky.ink, panel), 'place picker panel').toBeGreaterThanOrEqual(3)
      expect(ratio(paper.sheetInk, paper.sheet), 'paper').toBeGreaterThanOrEqual(3)
    })

    it(`${name}: scrubber edges contrast with each other and the horizon ≥ 3`, () => {
      expect(ratio(sky.ink, sky.ridgeNear), 'adjacent edges').toBeGreaterThanOrEqual(3)
      const edgeContrast = Math.max(ratio(sky.ink, sky.horizon), ratio(sky.ridgeNear, sky.horizon))
      expect(edgeContrast, 'stronger edge against the horizon').toBeGreaterThanOrEqual(3)
    })
  }
})

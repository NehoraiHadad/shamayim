import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cssTokens, ratio } from './contrast'
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

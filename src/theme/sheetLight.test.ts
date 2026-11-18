import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cssTokens, ratio } from './contrast'
import { isDarkPaper, sheetLight } from './sheetLight'
import type { ThemeId } from './skyThemes'

const css = readFileSync(new URL('../ui/tokens.css', import.meta.url), 'utf8')
const light = cssTokens(css, ':root')
const dark = { ...light, ...cssTokens(css, '.dark-sheet') }
const WEATHERS: ThemeId[] = ['clearDay', 'heat', 'cloudy', 'rain', 'dust', 'dawn', 'dusk', 'night']

describe('paper state', () => {
  it('turns dark with the stars and light again a little earlier, holding its state in between', () => {
    expect(isDarkPaper(-7, false)).toBe(true)
    expect(isDarkPaper(-5, false)).toBe(false)
    expect(isDarkPaper(-5, true)).toBe(true)
    expect(isDarkPaper(-3, true)).toBe(false)
    expect(isDarkPaper(-5.5, null)).toBe(true)
  })
  it('is light at sunset itself, whatever the theme says', () => {
    expect(sheetLight(2, 'dusk', false).dark).toBe(false)
    expect(sheetLight(2, 'dusk', false).sheet).not.toBe('#211A33')
  })
  it('a rainy night has dark paper', () => {
    expect(sheetLight(-20, 'rain', true).sheet.toUpperCase()).toBe('#12162B')
  })
})

describe('paper contrast through the day (WCAG AA)', () => {
  for (const weather of WEATHERS) {
    it(`${weather}: every text colour ≥ 4.5 from −18° to 20°`, () => {
      for (let alt = -18; alt <= 20; alt += 0.5) {
        for (const isDark of [true, false]) {
          if ((isDark && alt > -4) || (!isDark && alt < -6)) continue
          const p = sheetLight(alt, weather, isDark)
          const tokens = isDark ? dark : light
          for (const text of [p.sheetInk, p.sheetMuted, p.sheetAccent, tokens['--sheet-rain'], tokens['--sheet-sun']]) {
            expect(ratio(text, p.sheet), `${weather} ${alt}° ${isDark ? 'dark' : 'light'} ${text}`).toBeGreaterThanOrEqual(4.5)
          }
        }
      }
    })
  }
})

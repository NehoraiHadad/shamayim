import { describe, expect, it } from 'vitest'
import { makeForecast, TODAY } from '../test/makeForecast'
import { composeSummary } from './compose'

const at = (hhmm: string, date = TODAY) => `${date}T${hhmm}`
const text = (s: string[]) => s.join(' ')

describe('composeSummary — daytime', () => {
  it('isolates a below-freezing daytime maximum', () => {
    const f = makeForecast([{ max: -1, min: -4 }, { max: -1, min: -4 }])
    const summary = text(composeSummary(f, at('09:00')))
    expect(summary).toContain('עד\u00A0\u2066−1°\u2069')
    expect(summary).not.toMatch(/-\d/)
  })

  it('clear pleasant day with warming vs yesterday', () => {
    const f = makeForecast([{ max: 19, min: 12 }, { max: 23, min: 13 }, { max: 24, min: 14 }])
    expect(text(composeSummary(f, at('09:00')))).toBe('היום בהיר ונעים, עד\u00A0\u206623°\u2069. חם יותר מאתמול.')
  })

  it('says "בהמשך היום" when it is cloudy now but the day is clear', () => {
    const f = makeForecast([{ max: 19, min: 12 }, { max: 23, min: 13 }, { max: 24, min: 14 }])
    f.current.cloudCover = 90
    expect(composeSummary(f, at('09:00'))[0]).toBe('בהמשך היום בהיר ונעים, עד\u00A0\u206623°\u2069.')
  })

  it('very hot afternoon mentions tomorrow trend', () => {
    const f = makeForecast([{ max: 38, min: 26 }, { max: 39, min: 27 }, { max: 42, min: 29 }])
    expect(text(composeSummary(f, at('12:00')))).toBe('היום בהיר וחם מאוד, עד\u00A0\u206639°\u2069. מחר התחממות.')
  })

  it('extreme heat gets a shade window', () => {
    const f = makeForecast([{ max: 40, min: 28 }, { max: 43, min: 29 }, { max: 43, min: 29 }])
    const s = composeSummary(f, at('08:00'))
    expect(s[0]).toMatch(/^שרב, עד\u00A0\u206643°\u2069\. בין\u00A0\d\d:00 ל־\d\d:00 עדיף להישאר בצל\.$/)
  })

  it('likely rain from noon leads, temperature follows', () => {
    const rainy = (h: number) => (h >= 12 && h < 18 ? { precipProb: 70, precipitation: 1.5, weatherCode: 61 } : {})
    const f = makeForecast([{ max: 18, min: 10 }, { max: 17, min: 10, hour: rainy }, { max: 18, min: 10 }])
    expect(composeSummary(f, at('08:00'))).toEqual(['צפוי גשם מהצהריים, כ־9 מ״מ.', 'קריר, עד\u00A0\u206617°\u2069.'])
  })

  it('heavy dust is a hazard', () => {
    const f = makeForecast([{ max: 33, min: 22 }, { max: 34, min: 22 }, { max: 34, min: 22 }], () => 450)
    expect(composeSummary(f, at('10:00'))[0]).toBe('אובך כבד היום, עדיף למעט בפעילות בחוץ.')
  })

  it('brisk afternoon wind and light dust become extras', () => {
    const windy = (h: number) => (h === 16 ? { windSpeed: 25, windGusts: 38 } : {})
    const f = makeForecast([{ max: 33, min: 22 }, { max: 33, min: 22, hour: windy }, { max: 33, min: 22 }], () => 150)
    expect(text(composeSummary(f, at('12:00')))).toBe('היום בהיר וחם, עד\u00A0\u206633°\u2069. אחר הצהריים רוח ערה, ואובך קל.')
  })
})

describe('composeSummary — night', () => {
  it('isolates a freezing night minimum', () => {
    const f = makeForecast([{ max: 2, min: -2 }, { max: 2, min: -2 }, { max: 1, min: -3 }])
    const summary = text(composeSummary(f, at('21:00')))
    expect(summary).toContain('סביב\u00A0\u2066−3°\u2069')
    expect(summary).not.toMatch(/-\d/)
  })

  it('evening describes tonight and tomorrow', () => {
    const cloudy = () => ({ cloudCover: 50 })
    const f = makeForecast([{ max: 25, min: 15 }, { max: 25, min: 15 }, { max: 26, min: 16, hour: cloudy }])
    expect(composeSummary(f, at('21:00'))).toEqual(['הלילה נעים, סביב\u00A0\u206615°\u2069.', 'מחר מעונן חלקית וחמים, עד\u00A0\u206626°\u2069.'])
  })

  it('small hours describe the coming day as today', () => {
    const f = makeForecast([{ max: 15, min: 5 }, { max: 16, min: 6 }, { max: 16, min: 6 }])
    const s = composeSummary(f, at('02:00'))
    expect(s[0]).toMatch(/^הלילה קר, סביב\u00A0\u2066\d°\u2069\.$/)
    expect(s[1]).toBe('היום בהיר וקריר, עד\u00A0\u206616°\u2069.')
  })
})

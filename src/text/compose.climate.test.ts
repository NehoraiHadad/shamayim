import { describe, expect, it } from 'vitest'
import type { DayNormal } from '../domain/types'
import { makeForecast, TODAY } from '../test/makeForecast'
import { composeSummary } from './compose'

const at = (time: string) => `${TODAY}T${time}`
const normal: DayNormal = { tempMax: 26, tempMaxSd: 2, tempMin: 15, gustMax: 40, gustMaxSd: 8 }
const days = [{ max: 25, min: 15 }, { max: 30, min: 15 }, { max: 26, min: 15 }]

describe('climate-aware summaries', () => {
  it('puts warmer-than-normal first, before wind and dust, with at most two extras', () => {
    const f = makeForecast([days[0], { ...days[1], hour: () => ({ windSpeed: 25, windGusts: 35 }) }, days[2]],
      () => 150, { normals: { [TODAY]: normal } })
    expect(composeSummary(f, at('12:00'))).toEqual(['היום בהיר וחמים, עד\u00A0\u206630°\u2069.',
      'חם מהרגיל ליולי ב־\u20664°\u2069, ובצהריים רוח ערה.'])
  })
  it.each([
    [26, 30, 'בהיר וחמים, עד\u00A0\u206626°\u2069, אבל קריר מהרגיל ליולי ב־\u20664°\u2069.'],
    [16, 12, 'בהיר וקריר, עד\u00A0\u206616°\u2069, אבל חם מהרגיל ליולי ב־\u20664°\u2069.'],
    [33, 40, 'בהיר וחם, עד\u00A0\u206633°\u2069, אבל קר בהרבה מהרגיל ליולי, ב־\u20667°\u2069.'],
    [39, 43, 'בהיר וחם מאוד, עד\u00A0\u206639°\u2069, אבל קריר מהרגיל ליולי ב־\u20664°\u2069.'],
  ])('joins a contradictory anomaly to a %i° forecast with a %i° normal in both modes', (max, tempMax, sentence) => {
    const day = { max, min: 10 }
    const f = makeForecast([day, day, day])
    const comparison = { ...normal, tempMax }
    f.normals = { [TODAY]: comparison, [f.days[2].date]: comparison }

    expect(composeSummary(f, at('12:00'))).toEqual([`היום ${sentence}`])
    expect(composeSummary(f, at('21:00'))[1]).toBe(`מחר ${sentence}`)
  })
  it('keeps a colder anomaly for a cool day as the first extra', () => {
    const day = { max: 16, min: 10 }
    const f = makeForecast([day, day, day], () => 150, { normals: { [TODAY]: { ...normal, tempMax: 20 } } })
    expect(composeSummary(f, at('12:00'))).toEqual(['היום בהיר וקריר, עד\u00A0\u206616°\u2069.', 'קריר מהרגיל ליולי ב־\u20664°\u2069, ואובך קל.'])
  })
  it('keeps a contradictory anomaly when a hazard leads', () => {
    const f = makeForecast(days, () => 450, { normals: { [TODAY]: { ...normal, tempMax: 34 } } })
    expect(composeSummary(f, at('12:00'))).toEqual([
      'אובך כבד היום, עדיף למעט בפעילות בחוץ.', 'בהיר וחמים, עד\u00A0\u206630°\u2069, אבל קריר מהרגיל ליולי ב־\u20664°\u2069.',
    ])
  })
  it('omits the anomaly at normal and keeps the trend', () => {
    const f = makeForecast(days, undefined, { normals: { [TODAY]: { ...normal, tempMax: 30 } } })
    expect(composeSummary(f, at('12:00'))).toEqual(['היום בהיר וחמים, עד\u00A0\u206630°\u2069.', 'מחר התקררות.'])
  })
  it('appends the anomaly for tomorrow at night, using tomorrow normal', () => {
    const f = makeForecast(days)
    f.normals = { [TODAY]: { ...normal, tempMax: 40 }, [f.days[2].date]: { ...normal, tempMax: 22 } }
    expect(composeSummary(f, at('21:00'))[1]).toBe('מחר בהיר וחמים, עד\u00A0\u206626°\u2069, חם מהרגיל ליולי ב־\u20664°\u2069.')
    expect(composeSummary(f, at('02:00'))[1]).toBe('היום בהיר וחמים, עד\u00A0\u206630°\u2069, אבל קר בהרבה מהרגיל ליולי, ב־\u206610°\u2069.')
  })
  it('does not call 46km/h gusts strong in a place with normal gusts of 60', () => {
    const f = makeForecast([days[0], { ...days[1], hour: () => ({ windGusts: 46 }) }, days[2]], undefined,
      { normals: { [TODAY]: { ...normal, gustMax: 60 } } })
    expect(composeSummary(f, at('12:00')).join(' ')).not.toContain('חזקים')
  })
  it('calls 36 degrees sharav with a normal of 27 and uses the relative heat span', () => {
    const f = makeForecast([{ max: 36, min: 22 }, { max: 36, min: 22 }, { max: 36, min: 22 }], undefined,
      { normals: { [TODAY]: { ...normal, tempMax: 27 } } })
    expect(composeSummary(f, at('09:00'))).toEqual([
      expect.stringMatching(/^שרב, עד\u00A0\u206636°\u2069\. בין\u00A0\d\d:00 ל־\d\d:00 עדיף להישאר בצל\.$/),
      'חם בהרבה מהרגיל ליולי, ב־\u20669°\u2069.',
    ])
  })
  it('omits a colder anomaly for sharav in both modes', () => {
    const day = { max: 43, min: 29 }
    const f = makeForecast([day, day, day])
    const comparison = { ...normal, tempMax: 47 }
    f.normals = { [TODAY]: comparison, [f.days[2].date]: comparison }
    expect(composeSummary(f, at('12:00'))).toEqual([expect.stringMatching(/^שרב, עד\u00A0\u206643°\u2069\./)])
    expect(composeSummary(f, at('21:00'))[1]).toBe('מחר בהיר ושרב, עד\u00A0\u206643°\u2069.')
  })
})

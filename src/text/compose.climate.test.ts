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
    expect(composeSummary(f, at('12:00'))).toEqual(['היום בהיר וחמים, עד 30°.',
      'חם מהרגיל ליולי ב־4°, ובצהריים רוח ערה.'])
  })
  it('mentions colder conditions and is silent at normal', () => {
    const f = makeForecast(days, undefined, { normals: { [TODAY]: { ...normal, tempMax: 34 } } })
    expect(composeSummary(f, at('12:00')).join(' ')).toContain('קריר מהרגיל ליולי ב־4°')
    f.normals![TODAY].tempMax = 30
    expect(composeSummary(f, at('12:00')).join(' ')).not.toContain('מהרגיל')
  })
  it('appends the anomaly for tomorrow at night, using tomorrow normal', () => {
    const f = makeForecast(days)
    f.normals = { [TODAY]: { ...normal, tempMax: 40 }, [f.days[2].date]: { ...normal, tempMax: 22 } }
    expect(composeSummary(f, at('21:00'))[1]).toBe('מחר בהיר וחמים, עד 26°, חם מהרגיל ליולי ב־4°.')
    expect(composeSummary(f, at('02:00'))[1]).toContain('קר בהרבה מהרגיל ליולי, ב־10°')
  })
  it('does not call 46km/h gusts strong in a place with normal gusts of 60', () => {
    const f = makeForecast([days[0], { ...days[1], hour: () => ({ windGusts: 46 }) }, days[2]], undefined,
      { normals: { [TODAY]: { ...normal, gustMax: 60 } } })
    expect(composeSummary(f, at('12:00')).join(' ')).not.toContain('חזקים')
  })
  it('calls 36 degrees sharav with a normal of 27 and uses the relative heat span', () => {
    const f = makeForecast([{ max: 36, min: 22 }, { max: 36, min: 22 }, { max: 36, min: 22 }], undefined,
      { normals: { [TODAY]: { ...normal, tempMax: 27 } } })
    expect(composeSummary(f, at('09:00'))[0]).toMatch(/^שרב, עד 36°\. בין \d\d:00 ל־\d\d:00 עדיף להישאר בצל\.$/)
  })
})

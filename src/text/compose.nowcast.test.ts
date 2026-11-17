import { describe, expect, it } from 'vitest'
import { rollForward } from '../domain/now'
import { makeForecast, TODAY } from '../test/makeForecast'
import { nowcastPoints } from '../test/nowcastPoints'
import { composeSummary } from './compose'

const at = (time: string) => `${TODAY}T${time}`
const base = { max: 23, min: 15 }
function forecast(rain: (h: number) => boolean, mm = 1) {
  return makeForecast([base, { ...base, hour: (h) => rain(h) ? { precipProb: 70, precipitation: mm } : {} }, base])
}

describe('nowcast summaries', () => {
  it('leads with rain starting and folds imminent hazard amount', () => {
    const f = forecast((h) => h >= 10 && h < 15)
    f.nowcast = nowcastPoints(at('10:00'), (i) => i >= 3 ? 0.8 : 0)
    const s = composeSummary(f, at('10:00'))
    expect(s[0]).toBe('גשם צפוי להתחיל בעוד כחצי שעה, כ־5 מ״מ.')
    expect(s.join(' ')).not.toContain('בשעות הקרובות')
    expect(s.join(' ').match(/גשם/g)).toHaveLength(1)
  })
  it('retains a flood warning and keeps the whole summary within three sentences', () => {
    const f = forecast((h) => h >= 10 && h < 15, 5)
    f.nowcast = nowcastPoints(at('10:00'), (i) => i >= 3 ? 0.8 : 0)
    const s = composeSummary(f, at('10:00'))
    expect(s[0]).toBe('גשם צפוי להתחיל בעוד כחצי שעה, כ־25 מ״מ. חשש לשיטפונות בנחלים.')
    expect(s.join(' ').match(/\./g)).toHaveLength(3)
  })
  it('says rain again in the evening after an imminent stop', () => {
    const f = forecast((h) => h === 10 || h >= 18 && h < 21)
    f.nowcast = nowcastPoints(at('10:00'), (i) => i < 2 ? 0.8 : 0)
    expect(composeSummary(f, at('10:00')).slice(0, 2)).toEqual([
      'הגשם צפוי להיפסק בעוד כרבע שעה.', 'צפוי גשם שוב בערב, כ־3 מ״מ.',
    ])
  })
  it('drops the rain hazard after a stop if no rain returns but keeps dust', () => {
    const f = forecast((h) => h === 10)
    f.nowcast = nowcastPoints(at('10:00'), (i) => i < 2 ? 0.8 : 0)
    expect(composeSummary(f, at('10:00')).join(' ')).not.toContain('צפוי גשם')
    f.air = [{ time: at('10:00'), pm10: 450, uv: null, dust: null }]
    expect(composeSummary(f, at('10:00'))[1]).toBe('אובך כבד היום, עדיף למעט בפעילות בחוץ.')
  })
  it('leads in night mode and uses current time after rollForward', () => {
    const f = forecast((h) => h >= 21 && h < 23)
    f.nowcast = nowcastPoints(at('21:00'), (i) => i >= 3 ? 0.8 : 0)
    f.normals = { [TODAY]: { tempMax: 22, tempMaxSd: 2, tempMin: 15, gustMax: 40, gustMaxSd: 8 } }
    const rolled = rollForward(f, at('21:00'))
    expect(rolled.nowcast).toBe(f.nowcast)
    expect(rolled.normals).toBe(f.normals)
    expect(composeSummary(rolled, at('21:00'))[0]).toBe('גשם צפוי להתחיל בעוד כחצי שעה, כ־2 מ״מ.')
    expect(composeSummary(rolled, at('23:45')).join(' ')).not.toContain('להתחיל')
  })
  it('does not fold a later unrelated rain hazard into the nowcast', () => {
    const f = forecast((h) => h >= 18 && h < 21)
    f.nowcast = nowcastPoints(at('10:00'), (i) => i >= 3 ? 0.8 : 0)
    expect(composeSummary(f, at('10:00')).slice(0, 2)).toEqual([
      'גשם צפוי להתחיל בעוד כחצי שעה.', 'צפוי גשם בערב, כ־3 מ״מ.',
    ])
  })

  it('says again for returning rain after sunrise in night mode', () => {
    const f = forecast((h) => h === 4 || h >= 18 && h < 21)
    f.nowcast = nowcastPoints(at('04:00'), (i) => i < 2 ? 0.8 : 0)
    expect(composeSummary(f, at('04:00')).slice(0, 2)).toEqual([
      'הגשם צפוי להיפסק בעוד כרבע שעה.', 'צפוי גשם שוב בערב, כ־3 מ״מ.',
    ])
  })
})

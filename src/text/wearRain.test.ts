import { describe, expect, it } from 'vitest'
import layers from '../test/fixtures/forecast-layers-2026-11-17.json'
import { mapForecast } from '../data/openMeteo/mapForecast'
import { conditionOf, isWet } from '../domain/conditions'
import type { Forecast, HourPoint } from '../domain/types'
import { makeForecast, TODAY } from '../test/makeForecast'
import { wearTip } from './wear'

const at = (hhmm: string) => `${TODAY}T${hhmm}`
const RAIN = { precipProb: 80, precipitation: 2, weatherCode: 61 }
const SNOW = { precipProb: 80, precipitation: 1, weatherCode: 73 }
const day = (hours: number[], wet: Partial<HourPoint>, max = 18, min = 10) => makeForecast([
  { max, min },
  { max, min, hour: (h) => (hours.includes(h) ? wet : {}) },
  { max, min },
])
const tip = (f: Forecast, hhmm: string) => wearTip(f, at(hhmm))!

describe('rain gear', () => {
  it('forgets rain that has passed', () => {
    const f = day([7, 8, 9], RAIN)
    expect(tip(f, '06:30').garments).toContain('umbrella')
    expect(tip(f, '09:59').garments).toContain('umbrella')
    expect(tip(f, '10:00').garments).not.toContain('umbrella')
    expect(tip(f, '14:00').text).not.toMatch(/גשם|מטרייה/)
  })

  it('names only the rain still ahead', () => {
    const f = day([8, 19], RAIN)
    expect(tip(f, '07:00').text).toContain('קחו מטרייה, גשם צפוי בבוקר ובערב.')
    expect(tip(f, '13:00').text).toContain('קחו מטרייה, גשם צפוי בערב.')
  })

  it('rain through more than two parts of the day is all day', () => {
    expect(tip(day([8, 12, 16, 20], RAIN), '07:00').text).toContain('גשם צפוי לאורך היום.')
  })

  it('possible rain: a light jacket, with its hours', () => {
    const t = tip(day([16], { ...RAIN, precipProb: 40 }), '08:00')
    expect(t.text).toContain('כדאי מעיל גשם קל בתיק, ייתכן גשם אחר הצהריים.')
    expect(t.garments).toContain('rainJacket')
    expect(t.garments).not.toContain('umbrella')
  })

  it('snow alone calls for a coat, named once', () => {
    const mild = tip(day([12, 13], SNOW), '08:00')
    expect(mild.text).toContain('צפוי שלג בצהריים, קחו מעיל ונעליים אטומות.')
    expect(mild.garments.filter((g) => g === 'coat')).toHaveLength(1)
    expect(mild.garments).not.toContain('umbrella')
    const cold = tip(day([12, 13], SNOW, 2, -3), '08:00')
    expect(cold.text).toContain('צפוי שלג בצהריים, כדאי נעליים אטומות.')
    expect(cold.garments).toEqual(['coat'])
    expect(tip(day([12], { ...SNOW, precipProb: 40 }), '08:00').text).toContain('ייתכן שלג בצהריים')
  })

  it('rain mixed with snow still needs the umbrella', () => {
    const f = makeForecast([{ max: 5, min: 0 }, { max: 5, min: 0, hour: (h) => (h === 12 ? SNOW : h === 13 ? RAIN : {}) }, { max: 5, min: 0 }])
    expect(tip(f, '08:00').garments).toContain('umbrella')
  })
})

describe('the synthetic fixture', () => {
  it('tells the same rain by the day and by the hours', () => {
    const f = { ...mapForecast(layers), air: null } as Pick<Forecast, 'hours' | 'days'>
    for (const d of f.days.slice(1)) {
      const hours = f.hours.filter((h) => h.time.startsWith(d.date))
      const most = Math.max(...hours.map((h) => h.precipProb ?? 0))
      expect(d.precipProbMax, d.date).toBeGreaterThanOrEqual(Math.floor(most))
      if (most >= 55) {
        expect(isWet(conditionOf(d.weatherCode)), d.date).toBe(true)
        expect(d.precipSum).toBeCloseTo(hours.reduce((s, h) => s + h.precipitation, 0))
      }
    }
  })
})

import { describe, expect, it } from 'vitest'
import { makeForecast, TODAY } from '../test/makeForecast'
import { wearTip } from './wear'

const at = (hhmm: string) => `${TODAY}T${hhmm}`

describe('wearTip', () => {
  it('summer day: short sleeves all day plus heat advice', () => {
    const f = makeForecast([{ max: 38, min: 27 }, { max: 39, min: 28 }, { max: 38, min: 27 }])
    const tip = wearTip(f, at('08:00'))
    expect(tip?.when).toBe('היום')
    expect(tip?.text).toBe('חולצה קצרה לכל היום. בגדים בהירים, כובע והרבה מים.')
    expect(tip?.garments).toEqual(['tee', 'sunHat', 'water'])
  })

  it('winter day: warmer midday, sweater in the evening', () => {
    const f = makeForecast([{ max: 20, min: 9 }, { max: 21, min: 8 }, { max: 20, min: 9 }])
    const tip = wearTip(f, at('08:00'))
    expect(tip?.text).toMatch(/^שרוול ארוך דק בצהריים, .+ בבוקר ובערב\.$/)
    expect(tip?.garments[0]).toBe('longSleeve')
    expect(tip?.garments).toHaveLength(2)
  })

  it('switches to tomorrow in the afternoon', () => {
    const f = makeForecast([{ max: 25, min: 15 }, { max: 25, min: 15 }, { max: 30, min: 20 }])
    expect(wearTip(f, at('16:30'))?.when).toBe('מחר')
  })

  it('rain likely adds an umbrella', () => {
    const f = makeForecast([
      { max: 18, min: 10 },
      { max: 18, min: 10, hour: (h) => (h >= 12 && h <= 15 ? { precipProb: 70, precipitation: 2 } : {}) },
      { max: 18, min: 10 },
    ])
    expect(wearTip(f, at('08:00'))?.text).toContain('קחו מטרייה.')
    expect(wearTip(f, at('08:00'))?.garments).toContain('umbrella')
  })

  it('brisk wind feels colder', () => {
    const calm = makeForecast([{ max: 25, min: 23 }, { max: 25, min: 23 }, { max: 25, min: 23 }])
    const windy = makeForecast([
      { max: 25, min: 23 },
      { max: 25, min: 23, hour: () => ({ windSpeed: 30 }) },
      { max: 25, min: 23 },
    ])
    expect(wearTip(calm, at('12:00'))?.text).toMatch(/^חולצה קצרה/)
    expect(wearTip(windy, at('12:00'))?.text).toMatch(/^שרוול ארוך דק/)
  })
})

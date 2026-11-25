import { describe, expect, it } from 'vitest'
import { makeForecast, TODAY } from '../test/makeForecast'
import { ltr } from './isolate'
import { restOfDayWearTip, wearTip } from './wear'

const at = (hhmm: string) => `${TODAY}T${hhmm}`

describe('wearTip', () => {
  it('summer day: short sleeves all day plus heat advice', () => {
    const f = makeForecast([{ max: 38, min: 27 }, { max: 39, min: 28 }, { max: 38, min: 27 }])
    const tip = wearTip(f, at('08:00'))
    expect(tip?.when).toBe('היום')
    expect(tip?.text).toBe('חולצה קצרה לכל היום. בגדים בהירים, כובע והרבה מים.')
    expect(tip?.garments).toEqual(['tee', 'sunHat', 'water'])
    expect(tip?.hasTimingOrGear).toBe(true)
  })

  it('includes a warmer nighttime layer on a winter day', () => {
    const f = makeForecast([{ max: 20, min: 9 }, { max: 21, min: 8 }, { max: 20, min: 9 }])
    const tip = wearTip(f, at('08:00'))
    expect(tip?.text).toContain('סוודר או ז׳קט בלילה.')
    expect(tip?.garments).toEqual(['longSleeve', 'sweater', 'jacket'])
  })

  it('lets the illustration lead when one garment suffices', () => {
    const uniform = { max: 25, min: 25 }
    const f = makeForecast([uniform, uniform, uniform])
    const tip = wearTip(f, at('08:00'))

    expect(tip).toMatchObject({
      text: 'חולצה קצרה לכל היום.', garments: ['tee'], hasTimingOrGear: false,
    })
  })

  it('shows every distinct layer in the morning, including a warmer evening', () => {
    const day = { max: 26, min: 12 }
    const f = makeForecast([
      day,
      { ...day, hour: (h) => ({ temperature: h < 11 ? 12 : h < 18 ? 25 : 21 }) },
      day,
    ])
    const tip = wearTip(f, at('08:00'))

    expect(tip).toMatchObject({
      text: 'חולצה קצרה בצהריים ואחר הצהריים, סוודר או ז׳קט בבוקר, שרוול ארוך דק בערב ובלילה.',
      garments: ['tee', 'jacket', 'longSleeve'],
      hasTimingOrGear: true,
    })
    expect(wearTip(f, at('11:00'))?.garments).toEqual(['tee', 'longSleeve'])
    expect(wearTip(f, at('17:00'))?.text).toBe('חולצה קצרה אחר הצהריים, שרוול ארוך דק בערב ובלילה.')
    expect(wearTip(f, at('18:00'))?.text).toBe('שרוול ארוך דק להמשך היום.')
  })

  it('keeps a morning layer on the line if it is needed again in the evening', () => {
    const day = { max: 26, min: 16 }
    const f = makeForecast([day, { ...day, hour: (h) => ({ temperature: h < 11 || h >= 18 ? 16 : 26 }) }])
    const tip = wearTip(f, at('11:00'))
    expect(tip?.garments).toEqual(['tee', 'sweater'])
    expect(tip?.text).toContain('סוודר קל בערב ובלילה.')
    expect(tip?.text).not.toContain('בבוקר')
  })

  it('switches from today to tomorrow at 21:00', () => {
    const f = makeForecast([{ max: 25, min: 15 }, { max: 25, min: 15 }, { max: 30, min: 20 }])
    expect(wearTip(f, at('20:59'))?.when).toBe('היום')
    expect(wearTip(f, at('21:00'))?.when).toBe('מחר')
  })

  it('rain likely adds an umbrella', () => {
    const f = makeForecast([
      { max: 18, min: 10 },
      { max: 18, min: 10, hour: (h) => (h >= 12 && h <= 15 ? { precipProb: 70, precipitation: 2 } : {}) },
      { max: 18, min: 10 },
    ])
    expect(wearTip(f, at('08:00'))?.text).toContain('קחו מטרייה, גשם צפוי בצהריים ואחר הצהריים.')
    expect(wearTip(f, at('08:00'))?.garments).toContain('umbrella')
  })

  it('gives the approximate hour of remaining rain and removes the umbrella when it passes', () => {
    const warm = { max: 26, min: 26 }
    const f = makeForecast([warm, {
      ...warm, hour: (h) => h === 8 || h === 19 ? { precipProb: 80, precipitation: 2, weatherCode: 61 } : {},
    }])
    expect(wearTip(f, at('17:00'))?.text).toContain(`קחו מטרייה, גשם צפוי בסביבות\u00a0${ltr('19:00')}.`)
    expect(wearTip(f, at('19:59'))?.garments).toEqual(['tee', 'umbrella'])
    expect(wearTip(f, at('20:00'))?.garments).toEqual(['tee'])
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

describe('restOfDayWearTip', () => {
  const warm = { max: 26, min: 26 }
  const eveningRain = makeForecast([
    warm,
    { ...warm, hour: (h) => h === 22 ? { precipProb: 80, precipitation: 2, weatherCode: 61 } : {} },
    warm,
  ])

  it('keeps today’s umbrella visible after the clothesline switches to dry tomorrow', () => {
    expect(restOfDayWearTip(eveningRain, at('20:59'))).toBeNull()
    expect(wearTip(eveningRain, at('20:59'))?.garments).toEqual(['tee', 'umbrella'])
    expect(wearTip(eveningRain, at('21:00'))?.garments).toEqual(['tee'])
    expect(restOfDayWearTip(eveningRain, at('21:00'))).toBe(`קחו מטרייה, גשם צפוי בסביבות\u00a0${ltr('22:00')}.`)
    expect(restOfDayWearTip(eveningRain, at('22:59'))).toBe('קחו מטרייה, גשם צפוי בלילה.')
    expect(restOfDayWearTip(eveningRain, at('23:00'))).toBeNull()
  })

  it('recommends the warmer layer before a cooler night', () => {
    const forecast = makeForecast([warm, { ...warm, hour: (h) => ({ temperature: h < 22 ? 26 : 16 }) }])
    expect(restOfDayWearTip(forecast, at('21:00'))).toBe('כדאי לקחת סוודר קל.')
    expect(restOfDayWearTip(forecast, at('22:00'))).toBeNull()
  })

  it('has no recommendation when the saved forecast has ended', () => {
    expect(restOfDayWearTip(eveningRain, '2026-07-17T21:00')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { airInput } from '../../atmo/airInput'
import { SHADMOT_MEHOLA } from '../../config/place'
import { makeForecast, TODAY } from '../../test/makeForecast'
import { rainRate } from '../../world/airParts'
import type { WorldState } from '../../world/types'
import { sceneLabel } from './sceneLabel'

const world = (nameHe: string, sunUp: boolean): Pick<WorldState, 'place' | 'bodies'> => ({
  place: { ...SHADMOT_MEHOLA, nameHe },
  bodies: { sun: { up: sunUp } } as WorldState['bodies'],
})

describe('sceneLabel', () => {
  it('prepends the place name, current condition and isolated temperature', () => {
    const forecast = makeForecast([
      { max: 20, min: 10 },
      { max: 20, min: 10, code: 2 },
    ])
    forecast.elevation = 790
    forecast.current = { ...forecast.current, weatherCode: 2, temperature: 14, isDay: true }

    expect(sceneLabel(world('ירושלים', true), forecast, `${TODAY}T12:00`, null)).toBe(
      'ירושלים, מעונן חלקית, \u206614°\u2069. השמש מעל האופק. שקיעה ב־\u206619:45\u2069. גובה היישוב \u2066790\u2069 מטר.',
    )
  })

  it('isolates a negative temperature with U+2212 and describes below-sea-level elevation', () => {
    const forecast = makeForecast([
      { max: 4, min: -4 },
      { max: 4, min: -4, code: 71 },
    ])
    forecast.elevation = -175
    forecast.current = { ...forecast.current, weatherCode: 71, temperature: -3, isDay: false }

    expect(sceneLabel(world('חרמון', false), forecast, `${TODAY}T02:00`, null)).toBe(
      'חרמון, שלג, \u2066−3°\u2069. זריחה ב־\u206605:40\u2069. היישוב \u2066175\u2069 מטר מתחת לפני הים.',
    )
  })

  it('describes the selected hour condition and temperature while scrubbing', () => {
    const forecast = makeForecast([
      { max: 20, min: 5 },
      {
        max: 20,
        min: 5,
        hour: (h) => (h === 22 ? { weatherCode: 0, temperature: -2 } : {}),
      },
    ])
    forecast.elevation = 790
    forecast.current = { ...forecast.current, weatherCode: 61, temperature: 18, isDay: true }

    expect(sceneLabel(world('ירושלים', false), forecast, `${TODAY}T12:00`, `${TODAY}T22:00`)).toBe(
      'ירושלים, בהיר, \u2066−2°\u2069. שקיעה ב־\u206619:45\u2069. גובה היישוב \u2066790\u2069 מטר.',
    )
  })

  it('matches the drawn rain on both sides of the half-hour between a clear 14:00 and a rainy 15:00', () => {
    const forecast = makeForecast([
      { max: 24, min: 14 },
      {
        max: 24,
        min: 14,
        hour: (h) => {
          if (h === 14) return { weatherCode: 0, temperature: 24, precipitation: 0, cloudCover: 5 }
          if (h === 15) return { weatherCode: 61, temperature: 18, precipitation: 2.4, cloudCover: 90 }
          return {}
        },
      },
    ])
    forecast.elevation = 790
    const w = world('ירושלים', true)

    const at1420 = `${TODAY}T14:20`
    const shown20 = airInput(forecast, `${TODAY}T12:00`, w.place, at1420)
    expect(shown20.weatherCode).toBe(0)
    expect(rainRate(shown20)).toBeCloseTo(0.8)
    expect(sceneLabel(w, forecast, `${TODAY}T12:00`, at1420)).toBe(
      'ירושלים, גשום, \u206622°\u2069. שקיעה ב־\u206619:45\u2069. גובה היישוב \u2066790\u2069 מטר.',
    )

    const at1440 = `${TODAY}T14:40`
    const shown40 = airInput(forecast, `${TODAY}T12:00`, w.place, at1440)
    expect(shown40.weatherCode).toBe(61)
    expect(Math.round(shown40.temperature)).toBe(20)
    expect(sceneLabel(w, forecast, `${TODAY}T12:00`, at1440)).toBe(
      'ירושלים, גשום, \u206620°\u2069. שקיעה ב־\u206619:45\u2069. גובה היישוב \u2066790\u2069 מטר.',
    )
  })

  it('matches interpolated drizzle and cloud cover on both sides of the half-hour', () => {
    const forecast = makeForecast([
      { max: 24, min: 14 },
      {
        max: 24,
        min: 14,
        hour: (h) => {
          if (h === 14) return { weatherCode: 0, temperature: 24, precipitation: 0, cloudCover: 5 }
          if (h === 15) return { weatherCode: 3, temperature: 21, precipitation: 0, cloudCover: 95 }
          if (h === 16) return { weatherCode: 51, temperature: 20, precipitation: 0.9, cloudCover: 95 }
          return {}
        },
      },
    ])
    forecast.elevation = 790
    const w = world('ירושלים', true)

    expect(sceneLabel(w, forecast, `${TODAY}T12:00`, `${TODAY}T14:20`)).toContain('ירושלים, מעונן חלקית,')
    expect(sceneLabel(w, forecast, `${TODAY}T12:00`, `${TODAY}T14:40`)).toContain('ירושלים, מעונן חלקית,')
    expect(sceneLabel(w, forecast, `${TODAY}T12:00`, `${TODAY}T14:55`)).toContain('ירושלים, מעונן,')
    expect(sceneLabel(w, forecast, `${TODAY}T12:00`, `${TODAY}T15:20`)).toContain('ירושלים, טפטוף,')
  })
})

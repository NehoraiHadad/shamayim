import { describe, expect, it } from 'vitest'
import { airInput } from '../../atmo/airInput'
import { SHADMOT_MEHOLA } from '../../config/place'
import type { Forecast, LocalTime } from '../../domain/types'
import { makeForecast, TODAY } from '../../test/makeForecast'
import { next24h } from '../../ui/hourly/timeline'
import { rainRate } from '../../world/airParts'
import { unknownLand } from '../../world/terrain'
import type { WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { skyLayers, type SceneBox } from '../model'
import { sceneLabel } from './sceneLabel'

const world = (nameHe: string, sunUp: boolean): Pick<WorldState, 'place' | 'bodies'> => ({
  place: { ...SHADMOT_MEHOLA, nameHe },
  bodies: { sun: { up: sunUp } } as WorldState['bodies'],
})

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }

function label(w: Parameters<typeof sceneLabel>[0], forecast: Forecast, now: LocalTime, selected: LocalTime | null, hasLightning = false) {
  const slot = next24h(forecast, now).find((s) => s.type === 'hour' && s.time.slice(0, 13) === selected?.slice(0, 13))
  const temperature = slot?.type === 'hour' ? slot.temp : forecast.current.temperature
  return sceneLabel(w, forecast, now, selected, { temperature, hasLightning })
}

const thunderForecast = (precipitation: number) => {
  const forecast = makeForecast([
    { max: 24, min: 14 },
    {
      max: 24,
      min: 14,
      hour: (h) => h === 14
        ? { weatherCode: 0, temperature: 24, precipitation: 0, cloudCover: 5 }
        : h === 15
          ? { weatherCode: 95, temperature: 18, precipitation, cloudCover: 95 }
          : {},
    },
  ])
  forecast.elevation = 790
  forecast.current = { ...forecast.current, weatherCode: 95, temperature: 18, precipitation, cloudCover: 95, isDay: true }
  return forecast
}

describe('sceneLabel', () => {
  it('prepends the place name, current condition and isolated temperature', () => {
    const forecast = makeForecast([{ max: 20, min: 10 }, { max: 20, min: 10, code: 2 }])
    forecast.elevation = 790
    forecast.current = { ...forecast.current, weatherCode: 2, temperature: 14, isDay: true }

    expect(label(world('ירושלים', true), forecast, `${TODAY}T12:00`, null)).toBe(
      'ירושלים, מעונן חלקית, \u206614°\u2069. השמש מעל האופק. שקיעה ב־\u206619:45\u2069. גובה היישוב \u2066790\u2069 מטר.',
    )
  })

  it('isolates a negative temperature with U+2212 and describes below-sea-level elevation', () => {
    const forecast = makeForecast([{ max: 4, min: -4 }, { max: 4, min: -4, code: 71 }])
    forecast.elevation = -175
    forecast.current = { ...forecast.current, weatherCode: 71, temperature: -3, isDay: false }

    expect(label(world('חרמון', false), forecast, `${TODAY}T02:00`, null)).toBe(
      'חרמון, שלג, \u2066−3°\u2069. זריחה ב־\u206605:40\u2069. היישוב \u2066175\u2069 מטר מתחת לפני הים.',
    )
  })

  it('describes the selected hour condition and temperature while scrubbing', () => {
    const forecast = makeForecast([
      { max: 20, min: 5 },
      { max: 20, min: 5, hour: (h) => (h === 22 ? { weatherCode: 0, temperature: -2 } : {}) },
    ])
    forecast.elevation = 790
    forecast.current = { ...forecast.current, weatherCode: 61, temperature: 18, isDay: true }

    expect(label(world('ירושלים', false), forecast, `${TODAY}T12:00`, `${TODAY}T22:00`)).toBe(
      'ירושלים, בהיר, \u2066−2°\u2069. שקיעה ב־\u206619:45\u2069. גובה היישוב \u2066790\u2069 מטר.',
    )
  })

  it('matches the drawn rain on both sides of the half-hour between a clear 14:00 and a rainy 15:00', () => {
    const forecast = makeForecast([
      { max: 24, min: 14 },
      {
        max: 24,
        min: 14,
        hour: (h) => h === 14
          ? { weatherCode: 0, temperature: 24, precipitation: 0, cloudCover: 5 }
          : h === 15
            ? { weatherCode: 61, temperature: 18, precipitation: 2.4, cloudCover: 90 }
            : {},
      },
    ])
    forecast.elevation = 790
    const w = world('ירושלים', true)

    const at1420 = `${TODAY}T14:20`
    const shown20 = airInput(forecast, `${TODAY}T12:00`, w.place, at1420)
    expect(shown20.weatherCode).toBe(0)
    expect(rainRate(shown20)).toBeCloseTo(0.8)
    expect(Math.round(shown20.temperature)).toBe(22)
    expect(label(w, forecast, `${TODAY}T12:00`, at1420)).toBe(
      'ירושלים, גשום, \u206624°\u2069. שקיעה ב־\u206619:45\u2069. גובה היישוב \u2066790\u2069 מטר.',
    )

    const at1440 = `${TODAY}T14:40`
    const shown40 = airInput(forecast, `${TODAY}T12:00`, w.place, at1440)
    expect(shown40.weatherCode).toBe(61)
    expect(Math.round(shown40.temperature)).toBe(20)
    expect(label(w, forecast, `${TODAY}T12:00`, at1440)).toBe(
      'ירושלים, גשום, \u206624°\u2069. שקיעה ב־\u206619:45\u2069. גובה היישוב \u2066790\u2069 מטר.',
    )
  })

  it('matches interpolated drizzle and cloud cover on both sides of the half-hour', () => {
    const forecast = makeForecast([
      { max: 24, min: 14 },
      {
        max: 24,
        min: 14,
        hour: (h) => h === 14
          ? { weatherCode: 0, temperature: 24, precipitation: 0, cloudCover: 5 }
          : h === 15
            ? { weatherCode: 3, temperature: 21, precipitation: 0, cloudCover: 95 }
            : h === 16
              ? { weatherCode: 51, temperature: 20, precipitation: 0.9, cloudCover: 95 }
              : {},
      },
    ])
    forecast.elevation = 790
    const w = world('ירושלים', true)

    expect(label(w, forecast, `${TODAY}T12:00`, `${TODAY}T14:20`)).toContain('ירושלים, מעונן חלקית,')
    expect(label(w, forecast, `${TODAY}T12:00`, `${TODAY}T14:40`)).toContain('ירושלים, מעונן חלקית,')
    expect(label(w, forecast, `${TODAY}T12:00`, `${TODAY}T14:55`)).toContain('ירושלים, מעונן,')
    expect(label(w, forecast, `${TODAY}T12:00`, `${TODAY}T15:20`)).toContain('ירושלים, טפטוף,')
  })

  it('speaks scrubbed WMO 95 as rain or drizzle and live lightning as thunder', () => {
    const place = { ...SHADMOT_MEHOLA, nameHe: 'ירושלים' }
    const heavy = thunderForecast(2.4)
    const light = thunderForecast(0.3)
    const noon = `${TODAY}T12:00` as const
    const storm = `${TODAY}T14:40` as const
    const build = (forecast: Forecast, now: LocalTime, selected: LocalTime | null) =>
      buildWorld({ place, forecast, now, selected, terrain: unknownLand('offline'), landmarks: [] })
    const flashes = (w: WorldState, box = BOX) => skyLayers(w, box).filter((layer) => layer.kind === 'flash')

    for (const [forecast, rate, condition] of [[heavy, 1.6, 'גשום'], [light, 0.2, 'טפטוף']] as const) {
      const scrubbed = build(forecast, noon, storm)
      expect(scrubbed.rain?.rateMmH).toBeCloseTo(rate, 6)
      expect(scrubbed.rain?.thunderWeight).toBe(0)
      const lightning = flashes(scrubbed)
      expect(lightning).toHaveLength(0)
      expect(label(scrubbed, forecast, noon, storm, lightning.length > 0)).toContain(`ירושלים, ${condition},`)
    }

    // The 09:00 reading has expired by noon. The storm only reaches the live timeline later.
    const dry = build(heavy, noon, null)
    expect(dry.rain).toBeNull()
    expect(flashes(dry)).toHaveLength(0)
    expect(label(dry, heavy, noon, null)).toContain('ירושלים, שמשי,')

    const live = build(heavy, storm, null)
    expect(live.rain?.thunderWeight).toBeCloseTo(2 / 3, 6)
    const lightning = flashes(live)
    expect(lightning.length).toBeGreaterThan(0)
    expect(lightning[0].animated?.pulse).toMatchObject({ strength: live.rain?.thunderWeight })
    const scrubNow = build(heavy, storm, storm)
    expect(scrubNow.rain).toEqual({ ...live.rain, thunder: false, thunderWeight: 0 })
    expect(flashes(scrubNow)).toHaveLength(0)
    expect(label(scrubNow, heavy, storm, storm)).toContain('ירושלים, גשום,')
    expect(label(live, heavy, storm, null, lightning.length > 0)).toContain('ירושלים, סופת רעמים,')

    const beforeSkyLayout = flashes(live, { ...BOX, skyHeight: 0 })
    expect(beforeSkyLayout).toHaveLength(0)
    expect(label(live, heavy, storm, null, beforeSkyLayout.length > 0)).toContain('ירושלים, גשום,')
  })
})

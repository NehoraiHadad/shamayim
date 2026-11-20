import { describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA } from '../../config/place'
import weatherFixture from '../../test/fixtures/land-weather-shadmot.json'
import {
  ASK_LAND_WEATHER, drynessFromWeather, fetchRecentWeather, mapRecentWeather, recentWeatherUrl,
} from './recentWeather'
import { sampleLandAt } from './sampleLand'

function makeDailyBody(opts: {
  today: string; days: number
  rainAt?: Record<number, number>; showersAt?: Record<number, number>
  snowAt?: Record<number, number>; precipAt?: Record<number, number>
  omitPrecip?: boolean; soil?: number | null
}) {
  const baseMs = Date.parse(`${opts.today}T00:00:00Z`)
  const time: string[] = [], rain: (number | null)[] = [], showers: (number | null)[] = []
  const snow: (number | null)[] = [], precip: (number | null)[] = []
  for (let off = -opts.days; off <= 0; off++) {
    time.push(new Date(baseMs + off * 86_400_000).toISOString().slice(0, 10))
    rain.push(opts.rainAt?.[off] ?? 0); showers.push(opts.showersAt?.[off] ?? 0)
    snow.push(opts.snowAt?.[off] ?? 0)
    precip.push(opts.precipAt?.[off] ?? ((opts.rainAt?.[off] ?? 0) + (opts.showersAt?.[off] ?? 0)))
  }
  const soilFields = opts.soil !== null && opts.soil !== undefined
    ? { soil_moisture_0_to_1cm: opts.soil, soil_moisture_3_to_9cm: opts.soil } : {}
  return {
    current: { time: `${opts.today}T12:00`, ...soilFields },
    daily: opts.omitPrecip ? { time }
      : { time, rain_sum: rain, showers_sum: showers, snowfall_sum: snow, precipitation_sum: precip },
  }
}

describe('recentWeather (calendar-indexed completed liquid rain, snow & soil moisture)', () => {
  it('honors explicit disabled/enabled options and stays compatible when ASK_LAND_WEATHER is flipped', async () => {
    const spyOff = vi.fn()
    expect(await fetchRecentWeather(SHADMOT_MEHOLA, { enabled: false, fetchImpl: spyOff as unknown as typeof fetch })).toBeNull()
    expect(spyOff).not.toHaveBeenCalled()

    const mockOk = vi.fn(async (url: RequestInfo | URL) => {
      expect(String(url)).toBe(recentWeatherUrl(SHADMOT_MEHOLA, 'https://shamayim-api.example'))
      expect(String(url)).toContain('/v1/land-weather?')
      return new Response(JSON.stringify(weatherFixture), { status: 200 })
    })
    const on = await fetchRecentWeather(SHADMOT_MEHOLA, {
      enabled: true, base: 'https://shamayim-api.example', fetchImpl: mockOk as unknown as typeof fetch,
    })
    expect(on?.source).toBe('open-meteo:2026-11-20')
    expect(mockOk).toHaveBeenCalledTimes(1)

    // Default gate follows ASK_LAND_WEATHER without breaking when the owner flips it to true after deploy
    const defaultSpy = vi.fn(async () => new Response(JSON.stringify(weatherFixture), { status: 200 }))
    const defRes = await fetchRecentWeather(SHADMOT_MEHOLA, { fetchImpl: defaultSpy as unknown as typeof fetch })
    expect(defaultSpy).toHaveBeenCalledTimes(ASK_LAND_WEATHER ? 1 : 0)
    expect(defRes !== null).toBe(ASK_LAND_WEATHER)
  })

  it('maps recorded 60-day Open-Meteo fixture excluding today and reporting usable coverage', () => {
    const mapped = mapRecentWeather(weatherFixture, 1_795_172_400_000)!
    expect(mapped.source).toBe('open-meteo:2026-11-20')
    expect(mapped.precip14dMm).not.toBeNull()
    expect(mapped.precipCoverage14d).toBe(1)
    expect(mapped.precipCoverage60d).toBeGreaterThan(0.8)
    expect(mapped.precipCoverage60d).toBeLessThanOrEqual(1)
    expect(mapped.soilMoistureTop).toBeGreaterThan(0.05)
    expect(mapped.soilMoistureRoot).toBeGreaterThan(0.05)
  })

  it('excludes today forecast, captures exact end-of-window pulses, and separates snowfall from liquid rain', () => {
    const body = makeDailyBody({
      today: '2026-11-20', days: 60,
      rainAt: { 0: 40, [-14]: 8, [-15]: 10, [-60]: 12 }, showersAt: { [-14]: 2 }, soil: 0.2,
    })
    const mapped = mapRecentWeather(body, Date.parse('2026-11-20T12:00:00Z'))!
    expect(mapped.precip14dMm).toBe(10)
    expect(mapped.precip30dMm).toBe(20)
    expect(mapped.precip60dMm).toBe(32)
    expect(mapped.daysSinceRain).toBe(14)

    const snowy = makeDailyBody({ today: '2026-01-15', days: 60, snowAt: { [-2]: 14 }, precipAt: { [-2]: 20 }, soil: null })
    const snowMapped = mapRecentWeather(snowy, Date.parse('2026-01-15T12:00:00Z'))!
    expect(snowMapped.precip14dMm).toBe(0)
    expect(snowMapped.snowfall14dCm).toBe(14)
    expect(snowMapped.daysSinceRain).toBeNull()
  })

  it('indexes sparse calendar dates accurately and rejects positive precipitation with unknown snow phase', () => {
    // Only two rows present: 56 days ago (15 mm rain) and yesterday (0 mm).
    // Row-slicing previously put the 56-day-old rain into the 14d sum and reported daysSinceRain = 2!
    const sparse = {
      current: { time: '2026-11-20T12:00' },
      daily: {
        time: ['2026-09-25', '2026-11-19'], // -56d and -1d from 2026-11-20
        rain_sum: [15, 0],
        showers_sum: [0, 0],
      },
    }
    const mapped = mapRecentWeather(sparse, Date.parse('2026-11-20T12:00:00Z'))!
    expect(mapped.precip14dMm).toBe(0)
    expect(mapped.precipCoverage14d).toBeCloseTo(1 / 14, 5)
    expect(mapped.precip30dMm).toBe(0)
    expect(mapped.precip60dMm).toBe(15)
    expect(mapped.precipCoverage60d).toBeCloseTo(2 / 60, 5)
    expect(mapped.daysSinceRain).toBe(56)

    // Partial phase series: positive precipitation_sum without snowfall_sum, or rain_sum without showers_sum -> null!
    const unknownPhase = {
      current: { time: '2026-11-20T12:00', soil_moisture_0_to_1cm: 0.34, soil_moisture_3_to_9cm: 0.34 },
      daily: {
        time: ['2026-11-18', '2026-11-19'],
        rain_sum: [5, null],
        showers_sum: [null, null],
        precipitation_sum: [null, 12],
        snowfall_sum: [null, null],
      },
    }
    const partial = mapRecentWeather(unknownPhase, Date.parse('2026-11-20T12:00:00Z'))!
    expect(partial.precip14dMm).toBeNull()
    expect(partial.precipCoverage14d).toBe(0)
    expect(drynessFromWeather(partial)).toBeCloseTo(0, 4)

    // Empty precip + no soil returns null
    const empty = makeDailyBody({ today: '2026-11-20', days: 60, omitPrecip: true, soil: null })
    expect(mapRecentWeather(empty, Date.parse('2026-11-20T12:00:00Z'))).toBeNull()
  })

  it('rejects incomplete rain windows (<80%) and coverage-normalizes complete windows without dry bias', () => {
    const base = {
      date: '2026-11-20', source: 'open-meteo:2026-11-20' as const, fetchedAt: 1_795_172_400_000,
      precip30dMm: null, precip60dMm: null, precipCoverage30d: 0, precipCoverage60d: 0,
      snowfall14dCm: 0, daysSinceRain: 1, soilMoistureTop: null, soilMoistureRoot: null,
    }
    // 7 of 14 days at 2 mm/day (50% coverage) must not emit dry 0.60 Open-Meteo dryness
    const half = { ...base, precip14dMm: 14, precipCoverage14d: 0.5 }
    expect(drynessFromWeather(half)).toBeNull()
    expect(sampleLandAt({ cover: null, near: null, far: null, weather: half }, 32.35, 35.53, 11).drynessSource).toBe('climatology')
    // With soil moisture present, soil moisture alone drives dryness when rain coverage < 80%
    expect(drynessFromWeather({ ...half, soilMoistureTop: 0.21, soilMoistureRoot: 0.21 })).toBeCloseTo(0.5, 4)

    // 12 of 14 days (85.7%) at 2 mm/day matches full 14 of 14 days at 2 mm/day (dryness = 0.20)
    const full14 = { ...base, precip14dMm: 28, precipCoverage14d: 1 }
    const cov12 = { ...base, precip14dMm: 24, precipCoverage14d: 12 / 14 }
    expect(drynessFromWeather(full14)).toBeCloseTo(0.2, 4)
    expect(drynessFromWeather(cov12)).toBeCloseTo(0.2, 4)
    // 60-day window at 50/60 days (83.3%) at 1.5 mm/day matches full 60/60 days (90 mm -> p60 = 0.75)
    expect(drynessFromWeather({ ...full14, precip60dMm: 75, precipCoverage60d: 50 / 60 }))
      .toBeCloseTo(drynessFromWeather({ ...full14, precip60dMm: 90, precipCoverage60d: 1 })!, 4)
  })
})

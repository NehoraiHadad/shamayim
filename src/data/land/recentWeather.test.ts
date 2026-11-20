import { describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA } from '../../config/place'
import weatherFixture from '../../test/fixtures/land-weather-shadmot.json'
import {
  ASK_LAND_WEATHER, drynessFromWeather, fetchRecentWeather, mapRecentWeather, recentWeatherUrl,
} from './recentWeather'

describe('recentWeather (Open-Meteo past precipitation & soil moisture)', () => {
  it('stays disabled by default until the Worker allowlist is deployed', async () => {
    expect(ASK_LAND_WEATHER).toBe(false)
    const spy = vi.fn()
    const res = await fetchRecentWeather(SHADMOT_MEHOLA, { fetchImpl: spy as unknown as typeof fetch })
    expect(res).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('maps recorded 60-day Open-Meteo fixture with source tag, precip sums and soil moisture', () => {
    const mapped = mapRecentWeather(weatherFixture, 1_795_172_400_000)
    expect(mapped).not.toBeNull()
    expect(mapped!.source).toMatch(/^open-meteo:\d{4}-\d{2}-\d{2}$/)
    expect(mapped!.precip14dMm).toBeGreaterThanOrEqual(0)
    expect(mapped!.precip30dMm).toBeGreaterThanOrEqual(mapped!.precip14dMm)
    expect(mapped!.precip60dMm).toBeGreaterThanOrEqual(mapped!.precip30dMm)
    expect(mapped!.soilMoistureTop).toBeGreaterThan(0.05)
    expect(mapped!.soilMoistureTop).toBeLessThan(0.5)
    expect(mapped!.soilMoistureRoot).toBeGreaterThan(0.05)
    expect(mapped!.soilMoistureRoot).toBeLessThan(0.5)
  })

  it('computes dryness from wet vs parched conditions and fetches when explicitly enabled', async () => {
    const wet = drynessFromWeather({
      date: '2026-01-15', source: 'open-meteo:2026-01-15', fetchedAt: 0,
      precip14dMm: 45, precip30dMm: 95, precip60dMm: 160, daysSinceRain: 1,
      soilMoistureTop: 0.34, soilMoistureRoot: 0.35,
    })
    const parched = drynessFromWeather({
      date: '2026-08-15', source: 'open-meteo:2026-08-15', fetchedAt: 0,
      precip14dMm: 0, precip30dMm: 0, precip60dMm: 0, daysSinceRain: null,
      soilMoistureTop: 0.06, soilMoistureRoot: 0.08,
    })
    expect(wet).toBeLessThan(0.1)
    expect(parched).toBeGreaterThan(0.9)

    const fetched = await fetchRecentWeather(SHADMOT_MEHOLA, {
      enabled: true,
      base: 'https://shamayim-api.example',
      fetchImpl: (async (url) => {
        expect(String(url)).toBe(recentWeatherUrl(SHADMOT_MEHOLA, 'https://shamayim-api.example'))
        return new Response(JSON.stringify(weatherFixture), { status: 200 })
      }) as typeof fetch,
    })
    expect(fetched?.source).toMatch(/^open-meteo:/)
  })
})

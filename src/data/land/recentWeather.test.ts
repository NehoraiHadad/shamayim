import { describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA } from '../../config/place'
import weatherFixture from '../../test/fixtures/land-weather-shadmot.json'
import {
  ASK_LAND_WEATHER, drynessFromWeather, fetchRecentWeather, mapRecentWeather, recentWeatherUrl,
} from './recentWeather'

function makeDailyBody(opts: {
  today: string
  days: number
  rainAt?: Record<number, number> // negative offset from today: -1 = yesterday, -14 = 14th completed day ago, 0 = today
  showersAt?: Record<number, number>
  snowAt?: Record<number, number>
  precipAt?: Record<number, number>
  omitPrecip?: boolean
  soil?: number | null
}) {
  const baseMs = Date.parse(`${opts.today}T00:00:00Z`)
  const time: string[] = []
  const rain: (number | null)[] = [], showers: (number | null)[] = []
  const snow: (number | null)[] = [], precip: (number | null)[] = []
  for (let off = -opts.days; off <= 0; off++) {
    time.push(new Date(baseMs + off * 86_400_000).toISOString().slice(0, 10))
    rain.push(opts.rainAt?.[off] ?? 0)
    showers.push(opts.showersAt?.[off] ?? 0)
    snow.push(opts.snowAt?.[off] ?? 0)
    precip.push(opts.precipAt?.[off] ?? ((opts.rainAt?.[off] ?? 0) + (opts.showersAt?.[off] ?? 0)))
  }
  return {
    current: {
      time: `${opts.today}T12:00`,
      ...(opts.soil !== null && opts.soil !== undefined
        ? { soil_moisture_0_to_1cm: opts.soil, soil_moisture_3_to_9cm: opts.soil }
        : {}),
    },
    daily: opts.omitPrecip
      ? { time }
      : { time, rain_sum: rain, showers_sum: showers, snowfall_sum: snow, precipitation_sum: precip },
  }
}

describe('recentWeather (Open-Meteo completed past liquid rain, snow & soil moisture)', () => {
  it('stays disabled by default until /v1/land-weather is deployed', async () => {
    expect(ASK_LAND_WEATHER).toBe(false)
    const spy = vi.fn()
    const res = await fetchRecentWeather(SHADMOT_MEHOLA, { fetchImpl: spy as unknown as typeof fetch })
    expect(res).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('maps recorded 60-day Open-Meteo fixture excluding today and reporting usable coverage', () => {
    const mapped = mapRecentWeather(weatherFixture, 1_795_172_400_000)
    expect(mapped).not.toBeNull()
    expect(mapped!.source).toBe('open-meteo:2026-11-20')
    expect(mapped!.precip14dMm).not.toBeNull()
    expect(mapped!.precipCoverage14d).toBe(1)
    expect(mapped!.precipCoverage60d).toBeGreaterThan(0.8)
    expect(mapped!.precipCoverage60d).toBeLessThanOrEqual(1)
    expect(mapped!.soilMoistureTop).toBeGreaterThan(0.05)
    expect(mapped!.soilMoistureRoot).toBeGreaterThan(0.05)
  })

  it('excludes today forecast rain, captures exact end-of-window rain pulses, and excludes snowfall from liquid recharge', () => {
    // Rain forecast later today (off=0: 40 mm) must be ignored; pulse at off=-14 belongs to 14d; off=-15 only to 30d; off=-60 to 60d
    const body = makeDailyBody({
      today: '2026-11-20', days: 60,
      rainAt: { 0: 40, [-14]: 8, [-15]: 10, [-60]: 12 },
      showersAt: { [-14]: 2 },
      soil: 0.2,
    })
    const mapped = mapRecentWeather(body, Date.parse('2026-11-20T12:00:00Z'))!
    expect(mapped.precip14dMm).toBe(10) // 8 + 2 on day -14; today's 40 mm excluded!
    expect(mapped.precip30dMm).toBe(20) // + 10 on day -15
    expect(mapped.precip60dMm).toBe(32) // + 12 on day -60 (oldest completed day retained!)
    expect(mapped.daysSinceRain).toBe(14)

    // Snowfall (20 mm precip_sum = 14 cm snow, 0 liquid rain) must NOT count as liquid recharge or rain pulse
    const snowy = makeDailyBody({
      today: '2026-01-15', days: 60,
      rainAt: {}, showersAt: {}, snowAt: { [-2]: 14 }, precipAt: { [-2]: 20 },
      soil: null,
    })
    const snowMapped = mapRecentWeather(snowy, Date.parse('2026-01-15T12:00:00Z'))!
    expect(snowMapped.precip14dMm).toBe(0)
    expect(snowMapped.snowfall14dCm).toBe(14)
    expect(snowMapped.daysSinceRain).toBeNull()
  })

  it('preserves missing precipitation gaps instead of turning them into drought', () => {
    // Only time axis and no soil moisture -> returns null (never tags drought as open-meteo)
    const empty = makeDailyBody({ today: '2026-11-20', days: 60, omitPrecip: true, soil: null })
    expect(mapRecentWeather(empty, Date.parse('2026-11-20T12:00:00Z'))).toBeNull()

    // Only time axis + moist soil -> precip is null with 0 coverage, dryness comes from soil alone
    const soilOnly = makeDailyBody({ today: '2026-11-20', days: 60, omitPrecip: true, soil: 0.34 })
    const mapped = mapRecentWeather(soilOnly, Date.parse('2026-11-20T12:00:00Z'))!
    expect(mapped.precip14dMm).toBeNull()
    expect(mapped.precipCoverage14d).toBe(0)
    expect(drynessFromWeather(mapped)).toBeCloseTo(0, 4)
  })

  it('fetches via /v1/land-weather when explicitly enabled', async () => {
    const fetched = await fetchRecentWeather(SHADMOT_MEHOLA, {
      enabled: true,
      base: 'https://shamayim-api.example',
      fetchImpl: (async (url) => {
        expect(String(url)).toBe(recentWeatherUrl(SHADMOT_MEHOLA, 'https://shamayim-api.example'))
        expect(String(url)).toContain('/v1/land-weather?')
        return new Response(JSON.stringify(weatherFixture), { status: 200 })
      }) as typeof fetch,
    })
    expect(fetched?.source).toBe('open-meteo:2026-11-20')
  })
})

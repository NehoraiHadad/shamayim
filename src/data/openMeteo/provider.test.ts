import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA } from '../../config/place'
import live from '../../test/fixtures/forecast-multi-2026-11-17.json'
import { openMeteoIcon } from './provider'

function stubFetch(headers: Record<string, string>) {
  const fetchMock = vi.fn(async (url: string) => url.includes('air-quality')
    ? new Response('{}', { status: 503 })
    : new Response(JSON.stringify(live), { headers }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('openMeteoIcon provider', () => {
  it('takes fetchedAt from the Worker so a cached copy is not shown as just updated', async () => {
    const fetchedAt = Date.now() - 14 * 60_000
    stubFetch({ 'X-Fetched-At': String(fetchedAt) })
    const forecast = await openMeteoIcon.getForecast(SHADMOT_MEHOLA)
    expect(forecast.fetchedAt).toBe(fetchedAt)
  })

  it('uses the time of arrival when talking to Open-Meteo directly', async () => {
    stubFetch({})
    const before = Date.now()
    const forecast = await openMeteoIcon.getForecast(SHADMOT_MEHOLA)
    expect(forecast.fetchedAt).toBeGreaterThanOrEqual(before)
    expect(forecast.fetchedAt).toBeLessThanOrEqual(Date.now())
  })

  it('sends both requests to the Worker when VITE_WEATHER_API_BASE is set', async () => {
    vi.stubEnv('VITE_WEATHER_API_BASE', 'https://w.test')
    const fetchMock = stubFetch({})
    await openMeteoIcon.getForecast(SHADMOT_MEHOLA)
    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls.some((u) => u.startsWith('https://w.test/v1/forecast?'))).toBe(true)
    expect(urls.some((u) => u.startsWith('https://w.test/v1/air-quality?'))).toBe(true)
  })
})

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
    expect(urls.some((u) => u.startsWith('https://w.test/v1/normals?'))).toBe(true)
  })

  it('starts forecast, air, normals and the live anomaly in parallel and retains forecast on their failure', async () => {
    vi.stubEnv('VITE_WEATHER_API_BASE', 'https://w.test')
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url)
      await gate
      return url.includes('/forecast?') ? new Response(JSON.stringify(live)) : new Response('{}', { status: 503 })
    }))
    const pending = openMeteoIcon.getForecast(SHADMOT_MEHOLA)
    expect(calls).toHaveLength(4)
    expect(calls.some((u) => u.startsWith('https://w.test/v1/live?'))).toBe(true)
    release()
    const f = await pending
    expect(f.normals).toBeNull()
    expect(f.nowcast).toBeNull()
    expect(f.days.length).toBeGreaterThan(0)
  })

  it('attaches normals for forecast dates only', async () => {
    vi.stubEnv('VITE_WEATHER_API_BASE', 'https://w.test')
    const table = { tempMax: Array(366).fill(22), tempMaxSd: Array(366).fill(2), tempMin: Array(366).fill(12),
      gustMax: Array(366).fill(40), gustMaxSd: Array(366).fill(8) }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
      url.includes('/normals?') ? table : url.includes('/forecast?') ? live : {},
    ), { status: url.includes('/air-quality?') ? 503 : 200 })))
    const f = await openMeteoIcon.getForecast(SHADMOT_MEHOLA)
    expect(Object.keys(f.normals!)).toEqual(f.days.map((d) => d.date))
    expect(f.normals![f.days[1].date].tempMax).toBe(22)
  })
})

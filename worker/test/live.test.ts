import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handle, clearLiveMemo } from '../src/index'
import { forecastAt, imsTime, liveFor, parseRegionLatest, refreshLive, usualError, type KV, type LiveRun } from '../src/live'
import { STATIONS } from '../src/stations'
import { clearMemory } from '../src/store'

const HOUR = 3600_000

function memoryKv(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, get: async (k) => data.get(k) ?? null, put: async (k, v) => { data.set(k, v) } }
}

describe('IMS readings', () => {
  it('reads labels as Israel standard time all year, whatever offset IMS appends', () => {
    expect(imsTime('2026-07-15T12:00:00+03:00')).toBe(Date.UTC(2026, 6, 15, 10))
    expect(imsTime('2026-01-15T12:00:00+02:00')).toBe(Date.UTC(2026, 0, 15, 10))
    expect(imsTime('garbage')).toBeNull()
  })

  it('keeps only valid TD readings from a region answer', () => {
    const body = [
      { stationId: 2, regionData: { datetime: '2026-11-23T06:40:00+02:00', channels: [
        { name: 'Rain', value: 0, valid: true }, { name: 'TD', value: 14.3, valid: true }] } },
      { stationId: 3, regionData: { datetime: '2026-11-23T06:40:00+02:00', channels: [{ name: 'TD', value: 9, valid: false }] } },
      { stationId: 4, regionData: null },
    ]
    const out = parseRegionLatest(body)
    expect([...out.keys()]).toEqual([2])
    expect(out.get(2)).toEqual({ t: Date.UTC(2026, 10, 23, 4, 40), td: 14.3 })
    expect(parseRegionLatest({ not: 'a list' }).size).toBe(0)
  })
})

describe('forecast and usual error', () => {
  it('interpolates the station forecast between hours', () => {
    const fc = { fetchedAt: 0, start: 0, temps: [[10, 12, 14]] }
    expect(forecastAt(fc, 0, 0.5 * HOUR)).toBeCloseTo(11)
    expect(forecastAt(fc, 0, 2 * HOUR)).toBe(14)
    expect(forecastAt(fc, 0, 2.5 * HOUR)).toBeNull()
    expect(forecastAt(fc, 0, -HOUR)).toBeNull()
  })

  it("reads a station's usual error at the season centre and standard-time hour", () => {
    const s = STATIONS[0]
    // 15 July (summer centre), 10:00 UTC = 12:00 standard time.
    expect(usualError(s, Date.UTC(2026, 6, 15, 10))).toBeCloseTo(s.bias[2][12], 6)
  })
})

describe('refreshLive', () => {
  const now = Date.UTC(2026, 10, 23, 5, 25)
  const s0 = STATIONS[0]
  const obsTime = Date.UTC(2026, 10, 23, 5, 10)

  function fakeFetch(td: number, forecast: number) {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('https://api.open-meteo.com')) {
        const hours = Array.from({ length: 72 }, (_, i) => new Date(Date.UTC(2026, 10, 22) + i * HOUR).toISOString().slice(0, 16))
        return Response.json(STATIONS.map(() => ({ hourly: { time: hours,
          temperature_2m_icon_seamless: hours.map(() => forecast), temperature_2m_ecmwf_ifs025: hours.map(() => forecast) } })))
      }
      const region = Number(/regions\/(\d+)/.exec(url)?.[1])
      return Response.json(STATIONS.filter((s) => s.region === region).map((s) => ({ stationId: s.id,
        regionData: { datetime: '2026-11-23T07:10:00+02:00', channels: [{ name: 'TD', value: td, valid: true }] } })))
    })
  }

  it('stores each station’s anomaly: forecast minus observed minus its usual error', async () => {
    const kv = memoryKv()
    const fetch = fakeFetch(15, 17)
    const run = await refreshLive({ kv, fetch: fetch as unknown as typeof globalThis.fetch, now: () => now, token: 't' })
    expect(run.stations).toHaveLength(STATIONS.length)
    const first = run.stations.find(([id]) => id === s0.id)!
    expect(first[3]).toBeCloseTo(2 - usualError(s0, obsTime), 2)
    expect(first[4]).toBe(obsTime)
    expect(JSON.parse(kv.data.get('live')!).stations).toHaveLength(STATIONS.length)
    // 1 Open-Meteo request for all stations + one per IMS region: within the free plan's 50 subrequests.
    expect(fetch.mock.calls.length).toBeLessThan(15)
    // The IMS token goes in the header, never in a URL.
    expect(fetch.mock.calls.every(([u]) => !String(u).includes('t='))).toBe(true)
  })

  it('reuses fresh station forecasts instead of asking Open-Meteo every hour', async () => {
    const kv = memoryKv()
    const fetch = fakeFetch(15, 17)
    const deps = { kv, fetch: fetch as unknown as typeof globalThis.fetch, now: () => now, token: 't' }
    await refreshLive(deps)
    await refreshLive({ ...deps, now: () => now + HOUR })
    const om = fetch.mock.calls.filter(([u]) => String(u).startsWith('https://api.open-meteo.com'))
    expect(om).toHaveLength(1)
  })

  it('drops readings that are stale or wildly off (sensor faults)', async () => {
    const kv = memoryKv()
    const run = await refreshLive({ kv, fetch: fakeFetch(-20, 17) as unknown as typeof globalThis.fetch, now: () => now, token: 't' })
    expect(run.stations).toHaveLength(0)
    const late = await refreshLive({ kv, fetch: fakeFetch(15, 17) as unknown as typeof globalThis.fetch, now: () => now + 3 * HOUR, token: 't' })
    expect(late.stations).toHaveLength(0)
  })
})

describe('liveFor', () => {
  const run: LiveRun = { at: 1000, stations: [[1, 32.0, 35.0, 1.0, 900], [2, 32.0, 36.0, -1.0, 900]] }

  it('weights stations by distance (σ 20 km)', () => {
    const near = liveFor(run, 32.0, 35.0, 1000)
    expect(near.anomaly).toBeCloseTo(1, 1)
    expect(near.observedAt).toBe(900)
  })

  it('answers nothing far from every station or from an old run', () => {
    expect(liveFor(run, 30.0, 35.0, 1000).anomaly).toBeNull()
    expect(liveFor(run, 32.0, 35.0, 1000 + 4 * HOUR).anomaly).toBeNull()
    expect(liveFor(null, 32.0, 35.0, 1000).anomaly).toBeNull()
  })
})

describe('/v1/live', () => {
  const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext
  const cache = { match: async () => undefined, put: async () => undefined } as unknown as Cache
  beforeEach(() => { clearMemory(); clearLiveMemo() })

  it('serves the anomaly around a place from KV, with CORS', async () => {
    const now = Date.now()
    const kv = memoryKv()
    kv.data.set('live', JSON.stringify({ at: now, stations: [[1, 32.44, 35.51, 0.8, now - 15 * 60_000]] }))
    const env = { ALLOWED_ORIGINS: 'https://app.test', LIVE: kv as unknown as KVNamespace }
    const res = await handle(new Request('https://w.test/v1/live?latitude=32.43&longitude=35.55',
      { headers: { Origin: 'https://app.test' } }), env, ctx, cache)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.test')
    const body = await res.json() as { anomaly: number }
    expect(body.anomaly).toBeCloseTo(0.8)
  })

  it('answers no anomaly when the Worker has no live store yet', async () => {
    const res = await handle(new Request('https://w.test/v1/live?latitude=32&longitude=35'), {}, ctx, cache)
    expect(await res.json()).toMatchObject({ anomaly: null })
  })

  it('refuses a request without coordinates', async () => {
    const res = await handle(new Request('https://w.test/v1/live'), {}, ctx, cache)
    expect(res.status).toBe(400)
  })
})

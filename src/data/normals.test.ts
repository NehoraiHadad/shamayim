import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA as place } from '../config/place'
import { fetchNormals, normalsFor, validateNormals } from './normals'

const table = () => ({ tempMax: Array.from({ length: 366 }, (_, i) => i), tempMaxSd: Array(366).fill(2),
  tempMin: Array(366).fill(10), gustMax: Array(366).fill(40), gustMaxSd: Array(366).fill(8) })
let storage: Map<string, string>
const key = `shamayim:normals:v1:${place.id}`
const NOW = Date.UTC(2026, 10, 17)

beforeEach(() => {
  storage = new Map()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.stubEnv('VITE_WEATHER_API_BASE', 'https://w.test')
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v) })
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(table()))))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('normals', () => {
  it('maps leap day and March 1 consistently and includes only requested dates', () => {
    const dates = ['2024-02-29', '2024-03-01', '2025-03-01', '2026-01-01', '2026-12-31']
    const days = normalsFor(table(), dates)
    expect(Object.keys(days)).toEqual(dates)
    expect(dates.map((d) => days[d].tempMax)).toEqual([59, 60, 60, 0, 365])
  })
  it('requires all five arrays with 366 finite values', () => {
    expect(validateNormals(table())).toEqual(table())
    for (const value of [null, {}, { ...table(), tempMin: [1] },
      { ...table(), gustMax: Array(366).fill(null) }, { ...table(), tempMaxSd: Array(366).fill(Infinity) }]) {
      expect(() => validateNormals(value)).toThrow()
    }
  })
  it('uses only the Worker, then reuses local data for 180 days', async () => {
    expect(await fetchNormals(place)).toEqual(table())
    expect(fetch).toHaveBeenCalledWith(`https://w.test/v1/normals?latitude=${place.lat}&longitude=${place.lon}`, expect.anything())
    vi.setSystemTime(NOW + 179 * 86400_000)
    await fetchNormals(place)
    expect(fetch).toHaveBeenCalledTimes(1)
    vi.setSystemTime(NOW + 180 * 86400_000)
    await fetchNormals(place)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(storage.has(key)).toBe(true)
  })
  it('skips normals without a Worker base even if there is a cached table', async () => {
    vi.stubEnv('VITE_WEATHER_API_BASE', '')
    expect(await fetchNormals(place)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('ignores corrupt or invalid cached data', async () => {
    storage.set(key, JSON.stringify({ savedAt: NOW, table: { tempMax: [] } }))
    expect(await fetchNormals(place)).toEqual(table())
    storage.set(key, 'broken')
    await fetchNormals(place)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('still fetches when storage is blocked', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('quota') } })
    expect(await fetchNormals(place)).toEqual(table())
  })
  it('does not cache refusals or invalid responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 503 }))
    await expect(fetchNormals(place)).rejects.toThrow('503')
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}'))
    await expect(fetchNormals(place)).rejects.toThrow()
    expect(storage.size).toBe(0)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMET_FEED_MAX_AGE, COMET_STEP } from '../events/cometFeed'

const NOW = Date.parse('2026-11-25T10:15Z')
const START = Date.parse('2026-11-25T09:00Z')
const snapshot = { version: 1, collectedAt: NOW, tracks: [{ designation: 'C/2023 A3', magnitude: 1.2,
  observedAt: NOW - 60_000, corroboratedAt: NOW - 120_000,
  samples: Array.from({ length: 17 }, (_, i) => [START + i * COMET_STEP, 100, 40, 70e6, 60]),
}] }

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('reading the Worker comet snapshot', () => {
  it('shares the request and revalidates data expiry on read', async () => {
    vi.stubEnv('VITE_WEATHER_API_BASE', 'https://weather.test/')
    const fetch = vi.fn(async () => Response.json(snapshot))
    vi.stubGlobal('fetch', fetch)
    const { fetchComets } = await import('./comets')
    const [first, second] = await Promise.all([fetchComets(NOW), fetchComets(NOW + 60_000)])
    expect(first).toEqual(snapshot.tracks)
    expect(second).toEqual(first)
    expect(fetch).toHaveBeenCalledExactlyOnceWith('https://weather.test/v1/comets', { signal: expect.any(AbortSignal) })
    expect(await fetchComets(NOW + COMET_FEED_MAX_AGE + 1)).toEqual([])
  })

  it('keeps the feed optional and retries a temporary failure after five minutes', async () => {
    vi.stubEnv('VITE_WEATHER_API_BASE', '')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { fetchComets } = await import('./comets')
    expect(await fetchComets(NOW)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()

    vi.stubEnv('VITE_WEATHER_API_BASE', 'https://weather.test')
    fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json(snapshot))
    expect(await fetchComets(NOW)).toEqual([])
    expect(await fetchComets(NOW + 60_000)).toEqual([])
    expect(await fetchComets(NOW + 5 * 60_000)).toEqual(snapshot.tracks)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

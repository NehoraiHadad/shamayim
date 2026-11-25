import { afterEach, describe, expect, it, vi } from 'vitest'
import tle from '../test/fixtures/iss-tle.json'

const HOUR = 3_600_000
const FRESH = Date.parse('2026-11-25T17:00:00Z')

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('live ISS orbital elements', () => {
  it('shares concurrent fetches and retains usable elements through an upstream outage', async () => {
    const time = vi.spyOn(Date, 'now').mockReturnValue(FRESH)
    const fetchTle = vi.fn().mockResolvedValueOnce(Response.json(tle)).mockRejectedValue(new TypeError('network down'))
    vi.stubGlobal('fetch', fetchTle)
    const { loadIssOrbit } = await import('./issOrbit')
    const [one, two] = await Promise.all([loadIssOrbit(), loadIssOrbit()])
    expect(one).not.toBeNull()
    expect(two).toBe(one)
    expect(fetchTle).toHaveBeenCalledExactlyOnceWith('https://api.wheretheiss.at/v1/satellites/25544/tles',
      expect.objectContaining({ signal: expect.any(AbortSignal), credentials: 'omit' }))

    time.mockReturnValue(FRESH + 6 * HOUR)
    expect(await loadIssOrbit()).toBe(one)
    expect(await loadIssOrbit()).toBe(one)
    expect(fetchTle).toHaveBeenCalledTimes(2)

    time.mockReturnValue(FRESH + 72 * HOUR)
    expect(await loadIssOrbit()).toBeNull()
  })

  it('rejects an old orbit even when the response is recent', async () => {
    const now = FRESH + 72 * HOUR
    vi.spyOn(Date, 'now').mockReturnValue(now)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...tle, requested_timestamp: now / 1000 })))
    const { loadIssOrbit } = await import('./issOrbit')
    expect(await loadIssOrbit()).toBeNull()
  })
})

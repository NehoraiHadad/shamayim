import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA } from '../../config/place'
import { createGridWatcher } from './gridWatch'
import { FAR_TTL_MS, MAX_STALE_MS, NEAR_TTL_MS, WEATHER_MAX_STALE_MS } from './landCache'
import type { RecentLandWeather } from './types'
import { checkActiveWeather, createWeatherWatcher } from './weatherWatch'

afterEach(() => { vi.useRealTimers() })

function weatherAt(fetchedAt: number): RecentLandWeather {
  return {
    date: '2026-11-20', source: 'open-meteo:2026-11-20', fetchedAt,
    precip14dMm: 5, precip30dMm: 12, precip60dMm: 18,
    precipCoverage14d: 1, precipCoverage30d: 1, precipCoverage60d: 0.9,
    snowfall14dCm: 0, daysSinceRain: 4, soilMoistureTop: 0.14, soilMoistureRoot: 0.19,
  }
}

describe('active-tab weather & satellite grid watchers', () => {
  it('clears expired active weather at 24h even while a deferred refresh is pending and never resurrects it', async () => {
    vi.useFakeTimers()
    const t0 = 1_795_000_000_000
    vi.setSystemTime(t0)

    let resolveDeferred!: (w: RecentLandWeather | null) => void
    let calls = 0
    const updates: (RecentLandWeather | null)[] = []
    const ctrl = new AbortController()
    const watcher = createWeatherWatcher(SHADMOT_MEHOLA, ctrl.signal, (w) => updates.push(w), {
      readCached: async () => ({ value: weatherAt(t0 - 23 * 3_600_000), fresh: false }),
      writeCached: async () => undefined,
      fetchWeather: () => {
        calls++
        return new Promise((resolve) => { resolveDeferred = resolve })
      },
    })

    // Initial check publishes the 23h-old stale cache immediately and leaves a refresh pending
    const pending = watcher.check()
    await Promise.resolve(); await Promise.resolve()
    expect(updates).toHaveLength(1)
    expect(updates[0]).not.toBeNull()
    expect(calls).toBe(1)

    // Advance 1h + 2s while refresh is STILL pending -> expiry callback clears active weather immediately!
    await vi.advanceTimersByTimeAsync(3_600_000 + 2000)
    expect(updates.at(-1)).toBeNull()

    // Now the slow deferred refresh fails (null) -> must NOT resurrect the expired observation!
    resolveDeferred(null)
    await pending
    expect(updates.at(-1)).toBeNull()
    watcher.dispose()
  })

  it('validates weather reply age at publication time after a slow cache write', async () => {
    let now = 1_795_000_000_000
    const updates: (RecentLandWeather | null)[] = []
    const ctrl = new AbortController()
    // Reply is 23h59m old at fetch completion, but writeCached takes 2 minutes so it crosses 24h before publish!
    await checkActiveWeather(SHADMOT_MEHOLA, null, ctrl.signal, (w) => updates.push(w), {
      now: () => now,
      readCached: async () => null,
      fetchWeather: async () => weatherAt(now - WEATHER_MAX_STALE_MS + 60_000),
      writeCached: async () => { now += 120_000 },
    })
    expect(updates).toEqual([])
  })

  it('rechecks near and far grids when TTL elapses on active tabs and drops observations past MAX_STALE_MS', async () => {
    vi.useFakeTimers()
    const t0 = 1_795_000_000_000
    vi.setSystemTime(t0)

    // Near grid: stays quiet while < 5d, refreshes on focus after 5d, drops to null past 30d stale cap
    const nearUpdates: (string | null)[] = []
    let nearFetches = 0
    const ctrl = new AbortController()
    const nearW = createGridWatcher<string>(SHADMOT_MEHOLA, ctrl.signal, (v) => nearUpdates.push(v), {
      ttlMs: NEAR_TTL_MS, maxStaleMs: MAX_STALE_MS,
      readCached: async () => ({ value: 'near-v1', fresh: true, savedAt: t0 }),
      writeCached: async () => undefined,
      fetchGrid: async () => (++nearFetches === 1 ? 'near-v2' : null),
    })

    await nearW.check()
    expect(nearUpdates).toEqual(['near-v1'])
    expect(nearFetches).toBe(0)

    // Tab focus at day 2 (< 5d TTL): no fetch
    vi.setSystemTime(t0 + 2 * 86_400_000)
    await nearW.check()
    expect(nearFetches).toBe(0)

    // Tab focus at day 5 + 1s (> 5d TTL): fetches fresh near-v2
    vi.setSystemTime(t0 + NEAR_TTL_MS + 1000)
    await nearW.check()
    expect(nearFetches).toBe(1)
    expect(nearUpdates).toEqual(['near-v1', 'near-v2'])

    // Advance 30d + 2s past near-v2 (across the 24.85-day 32-bit timer cap!): refresh returns null, mounted grid dropped!
    await vi.advanceTimersByTimeAsync(MAX_STALE_MS + 5000)
    expect(nearUpdates.at(-1)).toBeNull()
    nearW.dispose()

    // Far grid: refreshes after 3d TTL on focus and drops immediately if > 30d while a refresh is pending
    vi.setSystemTime(t0)
    const farUpdates: (string | null)[] = []
    let resolveFar!: (v: string | null) => void
    const farW = createGridWatcher<string>(SHADMOT_MEHOLA, ctrl.signal, (v) => farUpdates.push(v), {
      ttlMs: FAR_TTL_MS, maxStaleMs: MAX_STALE_MS,
      readCached: async () => ({ value: 'far-v1', fresh: false, savedAt: t0 - MAX_STALE_MS + 60_000 }),
      writeCached: async () => undefined,
      fetchGrid: () => new Promise((r) => { resolveFar = r }),
    })
    const farPending = farW.check()
    await Promise.resolve(); await Promise.resolve()
    expect(farUpdates).toEqual(['far-v1'])
    await vi.advanceTimersByTimeAsync(62_000)
    expect(farUpdates.at(-1)).toBeNull() // dropped at 30d cap even while fetch is still pending!
    resolveFar(null)
    await farPending
    expect(farUpdates.at(-1)).toBeNull()
    farW.dispose()
  })
})

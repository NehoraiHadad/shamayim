import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA } from '../../config/place'
import {
  createMemoryStore, FAR_TTL_MS, MAX_STALE_MS, NEAR_TTL_MS,
  readCachedFar, readCachedNear, readCachedWeather,
  WEATHER_MAX_STALE_MS, WEATHER_TTL_MS, weatherExpiryDelayMs, weatherFreshness,
  writeCachedFar, writeCachedNear, writeCachedWeather,
} from './landCache'
import { packFarGrid, packNearGrid, unpackFarGrid, unpackNearGrid } from './landPack'
import type { FarLandGrid, NearLandGrid, RecentLandWeather } from './types'
import { checkActiveWeather, createWeatherWatcher } from './weatherWatch'

afterEach(() => { vi.useRealTimers() })

function sampleNear(): NearLandGrid {
  return {
    date: '2026-11-15', source: 's2:2026-11-15', fetchedAt: 1000,
    lat: 32.3, lon: 35.5, utmZone: 36, utmSouth: false, originE: 730_000, originN: 3_580_000,
    reachM: 5000, stepM: 5000, size: 2,
    rgb: Uint8Array.from([100, 140, 80, 180, 160, 120, 0, 0, 0, 240, 240, 245]),
    ndvi: Float32Array.from([0.55, 0.12, Number.NaN, -0.08]),
    ndsi: Float32Array.from([-0.22, -0.35, Number.NaN, 0.78]),
    snow: Float32Array.from([0, 0, Number.NaN, 0.85]),
    valid: Float32Array.from([1, 0.5, 0, 0.8]),
    rgbValid: Float32Array.from([1, 0.5, 0, 0.8]),
    ndviValid: Float32Array.from([1, 0.5, 0, 0.8]),
    ndsiValid: Float32Array.from([1, 0.5, 0, 0.8]),
    acquisitions: [{ date: '2026-11-15' }],
    acqIndex: Uint8Array.from([0, 0, 255, 0]),
    ndviAcqIndex: Uint8Array.from([0, 0, 255, 0]),
    ndsiAcqIndex: Uint8Array.from([0, 0, 255, 0]),
    snowAcqIndex: Uint8Array.from([0, 0, 255, 0]),
  }
}

function sampleFar(): FarLandGrid {
  return {
    date: '2026-11-18', source: 'gibs:2026-11-18', fetchedAt: 1000,
    lat: 32.3, lon: 35.5, reachKm: 60, stepKm: 60, size: 2,
    ndvi: Float32Array.from([0.41, Number.NaN, 0.09, -0.15]),
  }
}

function sampleWeather(fetchedAt: number): RecentLandWeather {
  return {
    date: '2026-11-20', source: 'open-meteo:2026-11-20', fetchedAt,
    precip14dMm: 5, precip30dMm: 12, precip60dMm: 18,
    precipCoverage14d: 1, precipCoverage30d: 1, precipCoverage60d: 0.9,
    snowfall14dCm: 0, daysSinceRain: 4, soilMoistureTop: 0.14, soilMoistureRoot: 0.19,
  }
}

describe('landCache TTL, upstream weather freshness and active-tab expiry/coalescing', () => {
  it('round-trips NearLandGrid and FarLandGrid packing within quantization bounds', () => {
    const uNear = unpackNearGrid(packNearGrid(sampleNear()))
    expect(uNear.ndvi[0]).toBeCloseTo(0.55, 2)
    expect(Number.isNaN(uNear.ndvi[2])).toBe(true)
    expect(uNear.ndsi[3]).toBeCloseTo(0.78, 2)
    expect(uNear.snow[3]).toBeCloseTo(0.85, 2)
    expect(uNear.acquisitions).toEqual([{ date: '2026-11-15' }])
    // Legacy cached records carrying removed sun-angle fields remain readable
    const legacy = { ...packNearGrid(sampleNear()), sunElevation: 38, sunAzimuth: 164, acquisitions: [{ date: '2026-11-15', sunElevation: 38 }] }
    const fromLegacy = unpackNearGrid(legacy as ReturnType<typeof packNearGrid>)
    expect(fromLegacy.acquisitions).toEqual([{ date: '2026-11-15' }])
    expect('sunElevation' in fromLegacy).toBe(false)

    const uFar = unpackFarGrid(packFarGrid(sampleFar()))
    expect(uFar.ndvi[0]).toBeCloseTo(0.41, 2)
    expect(Number.isNaN(uFar.ndvi[1])).toBe(true)
  })

  it('anchors weather freshness to upstream fetchedAt and enforces 24h WEATHER_MAX_STALE_MS', async () => {
    const store = createMemoryStore()
    const t0 = 1_795_000_000_000
    await writeCachedNear('p1', sampleNear(), store, t0)
    await writeCachedFar('p1', sampleFar(), store, t0)
    expect((await readCachedNear('p1', store, t0 + NEAR_TTL_MS - 1000))?.fresh).toBe(true)
    expect((await readCachedFar('p1', store, t0 + FAR_TTL_MS + 1000))?.fresh).toBe(false)
    expect(await readCachedNear('p1', store, t0 + MAX_STALE_MS + 1)).toBeNull()

    const staleUpstream = sampleWeather(t0 - 10 * 3_600_000)
    await writeCachedWeather('p1', staleUpstream, store, t0)
    expect((await readCachedWeather('p1', store, t0))?.fresh).toBe(false)
    expect(await readCachedWeather('p1', store, t0 + 15 * 3_600_000)).toBeNull()
    expect(weatherFreshness(sampleWeather(t0 - WEATHER_TTL_MS + 1000), t0)).toBe('fresh')
    expect(weatherFreshness(sampleWeather(t0 - WEATHER_TTL_MS - 1000), t0)).toBe('stale')
    expect(weatherFreshness(sampleWeather(t0 - WEATHER_MAX_STALE_MS - 1000), t0)).toBe('expired')
    expect(weatherExpiryDelayMs(staleUpstream, t0)).toBe(14 * 3_600_000)
  })

  it('rejects already-expired upstream replies instead of republishing them after clearing', async () => {
    const t0 = 1_795_000_000_000
    const expired = sampleWeather(t0 - WEATHER_MAX_STALE_MS - 60_000)
    const updates: (RecentLandWeather | null)[] = []
    const ctrl = new AbortController()
    await checkActiveWeather(SHADMOT_MEHOLA, expired, ctrl.signal, (w) => updates.push(w), {
      now: () => t0,
      fetchWeather: async () => sampleWeather(t0 - WEATHER_MAX_STALE_MS - 120_000),
      writeCached: async () => undefined,
    })
    expect(updates).toEqual([null]) // cleared expired entry and refused to publish expired upstream reply!
  })

  it('schedules 24h expiry for stale replies and failed 6h refreshes, and coalesces concurrent triggers', async () => {
    vi.useFakeTimers()
    const t0 = 1_795_000_000_000
    vi.setSystemTime(t0)

    // Case 1: Initial reply is already 10h stale -> must still schedule hard 24h expiry (in 14h) and clear to null!
    const updates1: (RecentLandWeather | null)[] = []
    const ctrl1 = new AbortController()
    let calls1 = 0
    const watcher1 = createWeatherWatcher(SHADMOT_MEHOLA, ctrl1.signal, (w) => updates1.push(w), {
      readCached: async () => null,
      writeCached: async () => undefined,
      fetchWeather: async () => (++calls1 === 1 ? sampleWeather(t0 - 10 * 3_600_000) : null),
    })
    // Simultaneous focus + visibility + initial mount triggers coalesce into ONE fetch!
    await Promise.all([watcher1.check(), watcher1.check(), watcher1.check()])
    expect(calls1).toBe(1)
    expect(updates1).toHaveLength(1)
    // Advance 14h + 2s: hard 24h expiry timer fires and clears stale weather even though refresh returns null!
    await vi.advanceTimersByTimeAsync(14 * 3_600_000 + 2000)
    expect(updates1.at(-1)).toBeNull()
    watcher1.dispose()

    // Case 2: Fresh entry whose 6h refresh FAILS still fires the 24h expiry timer and clears to null!
    vi.setSystemTime(t0)
    const updates2: (RecentLandWeather | null)[] = []
    const ctrl2 = new AbortController()
    let calls2 = 0
    const watcher2 = createWeatherWatcher(SHADMOT_MEHOLA, ctrl2.signal, (w) => updates2.push(w), {
      readCached: async () => ({ value: sampleWeather(t0), fresh: true }),
      writeCached: async () => undefined,
      fetchWeather: async () => { calls2++; return null },
    })
    await watcher2.check()
    expect(updates2).toHaveLength(1)
    // At 6h + 2s: refresh runs and fails -> active weather stays until 24h, expiry timer remains armed!
    await vi.advanceTimersByTimeAsync(6 * 3_600_000 + 2000)
    expect(calls2).toBe(1)
    expect(updates2.at(-1)).not.toBeNull()
    // At 24h + 2s: expiry timer clears it to null!
    await vi.advanceTimersByTimeAsync(18 * 3_600_000 + 2000)
    expect(updates2.at(-1)).toBeNull()
    watcher2.dispose()
  })
})

import { describe, expect, it } from 'vitest'
import {
  createMemoryStore, FAR_TTL_MS, MAX_STALE_MS, NEAR_TTL_MS,
  readCachedFar, readCachedNear, readCachedWeather, WEATHER_TTL_MS,
  writeCachedFar, writeCachedNear, writeCachedWeather,
} from './landCache'
import { packFarGrid, packNearGrid, unpackFarGrid, unpackNearGrid } from './landPack'
import type { FarLandGrid, NearLandGrid, RecentLandWeather } from './types'

function sampleNear(): NearLandGrid {
  return {
    date: '2026-11-15', source: 's2:2026-11-15', fetchedAt: 1000,
    lat: 32.3, lon: 35.5, reachM: 5000, stepM: 5000, size: 2,
    rgb: Uint8Array.from([100, 140, 80, 180, 160, 120, 0, 0, 0, 240, 240, 245]),
    ndvi: Float32Array.from([0.55, 0.12, Number.NaN, -0.08]),
    ndsi: Float32Array.from([-0.22, -0.35, Number.NaN, 0.78]),
    valid: Float32Array.from([1, 0.5, 0, 0.8]),
    sunElevation: 38.0,
  }
}

function sampleFar(): FarLandGrid {
  return {
    date: '2026-11-18', source: 'gibs:2026-11-18', fetchedAt: 1000,
    lat: 32.3, lon: 35.5, reachKm: 60, stepKm: 60, size: 2,
    ndvi: Float32Array.from([0.41, Number.NaN, 0.09, -0.15]),
  }
}

describe('landCache TTL and binary packing', () => {
  it('round-trips NearLandGrid and FarLandGrid packing within quantization bounds', () => {
    const near = sampleNear()
    const uNear = unpackNearGrid(packNearGrid(near))
    expect(uNear.ndvi[0]).toBeCloseTo(0.55, 2)
    expect(Number.isNaN(uNear.ndvi[2])).toBe(true)
    expect(uNear.ndsi[3]).toBeCloseTo(0.78, 2)
    expect(uNear.valid[1]).toBeCloseTo(0.5, 2)
    expect(uNear.sunElevation).toBe(38.0)

    const far = sampleFar()
    const uFar = unpackFarGrid(packFarGrid(far))
    expect(uFar.ndvi[0]).toBeCloseTo(0.41, 2)
    expect(Number.isNaN(uFar.ndvi[1])).toBe(true)
    expect(uFar.ndvi[3]).toBeCloseTo(-0.15, 2)
  })

  it('enforces fresh TTL, stale-while-revalidate window and MAX_STALE eviction', async () => {
    const store = createMemoryStore()
    const t0 = 1_795_000_000_000
    await writeCachedNear('p1', sampleNear(), store, t0)
    await writeCachedFar('p1', sampleFar(), store, t0)
    const wx: RecentLandWeather = {
      date: '2026-11-20', source: 'open-meteo:2026-11-20', fetchedAt: t0,
      precip14dMm: 5, precip30dMm: 12, precip60dMm: 18, daysSinceRain: 4,
      soilMoistureTop: 0.14, soilMoistureRoot: 0.19,
    }
    await writeCachedWeather('p1', wx, store, t0)

    // Fresh inside TTL
    expect((await readCachedNear('p1', store, t0 + NEAR_TTL_MS - 1000))?.fresh).toBe(true)
    expect((await readCachedFar('p1', store, t0 + FAR_TTL_MS - 1000))?.fresh).toBe(true)
    expect((await readCachedWeather('p1', store, t0 + WEATHER_TTL_MS - 1000))?.fresh).toBe(true)

    // Stale-while-revalidate past TTL but within MAX_STALE_MS
    const staleNear = await readCachedNear('p1', store, t0 + NEAR_TTL_MS + 1000)
    expect(staleNear?.fresh).toBe(false)
    expect(staleNear?.value.source).toBe('s2:2026-11-15')
    expect((await readCachedFar('p1', store, t0 + FAR_TTL_MS + 1000))?.fresh).toBe(false)
    expect((await readCachedWeather('p1', store, t0 + WEATHER_TTL_MS + 1000))?.fresh).toBe(false)

    // Expired past MAX_STALE_MS -> evicted
    expect(await readCachedNear('p1', store, t0 + MAX_STALE_MS + 1)).toBeNull()
    expect(await readCachedNear('p1', store, t0)).toBeNull()
  })
})

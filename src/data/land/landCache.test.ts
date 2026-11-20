import { describe, expect, it, vi } from 'vitest'
import { SHADMOT_MEHOLA } from '../../config/place'
import { createIdbStore } from './idbStore'
import {
  createMemoryStore, FAR_TTL_MS, MAX_STALE_MS, NEAR_TTL_MS,
  readCachedFar, readCachedNear, readCachedWeather,
  WEATHER_MAX_STALE_MS, WEATHER_TTL_MS, weatherFreshness,
  writeCachedFar, writeCachedNear, writeCachedWeather,
} from './landCache'
import { packFarGrid, packNearGrid, unpackFarGrid, unpackNearGrid } from './landPack'
import type { FarLandGrid, NearLandGrid, RecentLandWeather } from './types'
import { checkActiveWeather } from './useLand'

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
    acquisitions: [{ date: '2026-11-15', sunElevation: 38.0, sunAzimuth: 164.0 }],
    acqIndex: Uint8Array.from([0, 0, 255, 0]),
    ndviAcqIndex: Uint8Array.from([0, 0, 255, 0]),
    ndsiAcqIndex: Uint8Array.from([0, 0, 255, 0]),
    snowAcqIndex: Uint8Array.from([0, 0, 255, 0]),
    sunElevation: 38.0, sunAzimuth: 164.0,
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

/** Minimal fake IndexedDB double supporting success, blocked open, and write/read errors or aborts. */
function makeFakeIdb(opts: {
  blocked?: boolean
  failWrites?: boolean
  abortWrites?: boolean
  abortReads?: boolean
  seed?: Record<string, unknown>
} = {}): IDBFactory {
  const backing = new Map<string, unknown>(Object.entries(opts.seed ?? {}))
  const db = {
    close() {},
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    transaction(_store: string, mode: IDBTransactionMode) {
      const tx: Record<string, unknown> = { oncomplete: null, onerror: null, onabort: null }
      tx.objectStore = () => ({
        get(key: string) {
          const req: Record<string, unknown> = { result: backing.get(key), onsuccess: null, onerror: null }
          queueMicrotask(() => {
            if (opts.abortReads) (tx.onabort as (() => void) | null)?.()
            else { (req.onsuccess as (() => void) | null)?.(); (tx.oncomplete as (() => void) | null)?.() }
          })
          return req
        },
        put(val: unknown, key: string) {
          queueMicrotask(() => {
            if (opts.abortWrites) (tx.onabort as (() => void) | null)?.()
            else if (opts.failWrites) (tx.onerror as (() => void) | null)?.()
            else { backing.set(key, val); (tx.oncomplete as (() => void) | null)?.() }
          })
        },
        delete(key: string) {
          queueMicrotask(() => {
            if (opts.failWrites) (tx.onerror as (() => void) | null)?.()
            else { backing.delete(key); (tx.oncomplete as (() => void) | null)?.() }
          })
        },
      })
      void mode
      return tx
    },
  }
  return {
    open() {
      const req: Record<string, unknown> = { result: db, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null }
      queueMicrotask(() => {
        if (opts.blocked) (req.onblocked as (() => void) | null)?.()
        else (req.onsuccess as (() => void) | null)?.()
      })
      return req
    },
  } as unknown as IDBFactory
}

describe('landCache TTL, upstream weather freshness and resilient IDB fallback', () => {
  it('round-trips NearLandGrid and FarLandGrid packing within quantization bounds', () => {
    const uNear = unpackNearGrid(packNearGrid(sampleNear()))
    expect(uNear.ndvi[0]).toBeCloseTo(0.55, 2)
    expect(Number.isNaN(uNear.ndvi[2])).toBe(true)
    expect(uNear.ndsi[3]).toBeCloseTo(0.78, 2)
    expect(uNear.snow[3]).toBeCloseTo(0.85, 2)
    expect(Number.isNaN(uNear.snow[2])).toBe(true)
    expect(uNear.utmZone).toBe(36)
    expect(uNear.acquisitions[0].sunElevation).toBe(38.0)

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

    // Worker STALE response that is already 10h old when inserted at t0 must read back as stale immediately!
    const staleUpstream = sampleWeather(t0 - 10 * 3_600_000)
    await writeCachedWeather('p1', staleUpstream, store, t0)
    const hit = await readCachedWeather('p1', store, t0)
    expect(hit).not.toBeNull()
    expect(hit!.fresh).toBe(false)

    // Evicted past WEATHER_MAX_STALE_MS (24h from upstream fetchedAt, NOT 30 days)
    expect(await readCachedWeather('p1', store, t0 + 15 * 3_600_000)).toBeNull()
    expect(weatherFreshness(sampleWeather(t0 - WEATHER_TTL_MS + 1000), t0)).toBe('fresh')
    expect(weatherFreshness(sampleWeather(t0 - WEATHER_TTL_MS - 1000), t0)).toBe('stale')
    expect(weatherFreshness(sampleWeather(t0 - WEATHER_MAX_STALE_MS - 1000), t0)).toBe('expired')
  })

  it('clears an expired active weather entry and triggers refresh on recheck', async () => {
    const t0 = 1_795_000_000_000
    const expired = sampleWeather(t0 - WEATHER_MAX_STALE_MS - 60_000)
    const fresh = sampleWeather(t0)
    const updates: (RecentLandWeather | null)[] = []
    const fetchSpy = vi.fn(async () => fresh)
    const ctrl = new AbortController()
    await checkActiveWeather(SHADMOT_MEHOLA, expired, ctrl.signal, (w) => updates.push(w), {
      now: () => t0, fetchWeather: fetchSpy, writeCached: async () => undefined,
    })
    expect(updates).toEqual([null, fresh]) // cleared expired entry first, then updated with fresh!
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Fresh active entry does not refetch
    const fetchSpy2 = vi.fn(async () => fresh)
    await checkActiveWeather(SHADMOT_MEHOLA, fresh, ctrl.signal, () => undefined, {
      now: () => t0 + 1000, fetchWeather: fetchSpy2,
    })
    expect(fetchSpy2).not.toHaveBeenCalled()
  })

  it('keeps memory fallback authoritative on failed/aborted IDB writes, bounds entries, and survives blocked open', async () => {
    // 1. Failed IDB write stays authoritative over older IDB entry and missing IDB key
    const failStore = createIdbStore(makeFakeIdb({ failWrites: true, seed: { existing: 'old-idb' } }), { maxMemoryEntries: 2 })
    await failStore.set('existing', 'new-mem')
    await failStore.set('missing-in-idb', 'mem-only')
    expect(await failStore.get('existing')).toBe('new-mem')
    expect(await failStore.get('missing-in-idb')).toBe('mem-only')
    // Bounded memory eviction (max 2): inserting 3rd evicts oldest ('existing')
    await failStore.set('third', 'val3')
    expect(await failStore.get('third')).toBe('val3')

    // 2. Blocked IDB open resolves promptly without hanging and falls back to memory
    const blockedStore = createIdbStore(makeFakeIdb({ blocked: true }))
    await blockedStore.set('k', 'from-mem')
    expect(await blockedStore.get('k')).toBe('from-mem')

    // 3. Aborted write & read transactions resolve cleanly instead of hanging
    const abortWriteStore = createIdbStore(makeFakeIdb({ abortWrites: true }))
    await abortWriteStore.set('a', 'saved-on-abort')
    expect(await abortWriteStore.get('a')).toBe('saved-on-abort')
    const abortReadStore = createIdbStore(makeFakeIdb({ abortReads: true, seed: { x: 'val' } }))
    expect(await abortReadStore.get('x')).toBeNull()
  })
})

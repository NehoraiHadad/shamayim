import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../../config/place'
import type { TiffImageLike, TiffLike } from './cogReader'
import { createCoverWatcher } from './gridWatch'
import { createMemoryStore } from './landCache'
import { loadFootprintLandCover, resetLandCoverCache, type LandCover } from './landData'
import { prepareLandSampler } from './sampleLand'
import { WORLDCOVER_SAS_URL } from './worldCoverCog'
import { worldCoverTileName } from './worldCoverGrid'

const LAND_DIR = path.resolve('public/data/land/il')

function diskFetch(sasToken?: string): typeof fetch {
  return (async (input) => {
    const url = String(input)
    if (url === WORLDCOVER_SAS_URL) {
      if (!sasToken) throw new TypeError('Failed to fetch (CORS)')
      return new Response(JSON.stringify({ token: sasToken, 'msft:expiry': '2099-01-01T00:00:00Z' }), { status: 200 })
    }
    const full = path.join(LAND_DIR, path.basename(url))
    if (!fs.existsSync(full)) return new Response(null, { status: 404 })
    return new Response(fs.readFileSync(full, 'utf8'), { status: 200 })
  }) as typeof fetch
}

function makeWorldCoverCog(tLat: number, tLon: number, readLog: number[]): TiffLike {
  const sizes = [36000, 18000, 9000, 4500, 2250, 1125, 562]
  const img = (idx: number, dim: number): TiffImageLike => ({
    getWidth: () => dim, getHeight: () => dim,
    getBoundingBox: () => [tLon, tLat, tLon + 3, tLat + 3], getGeoKeys: () => ({}),
    async readRasters({ window: [x0, y0, x1, y1] }) {
      readLog.push(idx)
      const w = x1 - x0, h = y1 - y0, out = new Uint8Array(w * h)
      for (let py = 0; py < h; py++) {
        const lat = tLat + 3 - ((y0 + py + 0.5) / dim) * 3
        for (let px = 0; px < w; px++) {
          const lon = tLon + ((x0 + px + 0.5) / dim) * 3
          // Paris center built (50), west forest (10), south river/lake (80), far-north explicit nodata (0)
          out[py * w + px] = lat > 49.1 ? 0 : lat < 48.6 ? 80 : lon < 2.2 ? 10 : 50
        }
      }
      return out
    },
  })
  return { getImageCount: async () => sizes.length, getImage: async (i) => img(i, sizes[i]) }
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); resetLandCoverCache() })

describe('loadFootprintLandCover regional fast path, out-of-region COG fallback and caching', () => {
  it('uses regional coarse overview as fast path across ±60 km borders, restores omitted sea tiles and preserves nodata', async () => {
    const place = { lat: 32.3465, lon: 35.5325 }, openTiff = vi.fn()
    const cover = await loadFootprintLandCover(place, undefined, 6, diskFetch(), { openTiff })
    expect(cover).not.toBeNull(); expect(openTiff).not.toHaveBeenCalled()
    expect(cover!.coverAt(32.3465, 36.17)).toBeGreaterThan(0); expect(cover!.coverAt(33.85, 35.60)).toBeGreaterThan(0)
    expect(cover!.coverAt(29.05, 35.00)).toBeGreaterThan(0); expect(fs.existsSync(path.join(LAND_DIR, '321_346.json'))).toBe(false)
    expect(cover!.coverAt(32.15, 34.65)).toBe(8); expect(cover!.coverAt(31.50, 35.48)).toBe(8); expect(cover!.coverAt(32.10, 34.05)).toBe(0)
  })

  it('loads coarse WorldCover COG overview for out-of-region Paris, caches per place, preserves nodata and handles CORS failure', async () => {
    expect([worldCoverTileName(48, 0), worldCoverTileName(-36, 18), worldCoverTileName(36, -123)]).toEqual(['N48E000', 'S36E018', 'N36W123'])
    const paris = { lat: 48.86, lon: 2.35 }, store = createMemoryStore(), readIfds: number[] = []
    const openTiff = vi.fn(async (h: string) => (h.includes('N48E000') ? makeWorldCoverCog(48, 0, readIfds) : makeWorldCoverCog(48, 3, readIfds)))
    const cover = await loadFootprintLandCover(paris, undefined, 6, diskFetch('sas-tok'), { placeId: 'paris', store, openTiff })
    expect(readIfds).toEqual([6, 6]); expect(cover!.coverAt(48.86, 2.35)).toBe(5); expect(cover!.coverAt(48.86, 3.05)).toBe(5)
    expect(cover!.coverAt(48.86, 2.05)).toBe(1); expect(cover!.coverAt(48.55, 2.35)).toBe(8); expect(cover!.coverAt(49.20, 2.35)).toBe(0)
    openTiff.mockClear()
    const cached = await loadFootprintLandCover(paris, undefined, 6, diskFetch(), { placeId: 'paris', store, openTiff })
    expect(cached!.coverAt(48.86, 2.35)).toBe(5); expect(openTiff).not.toHaveBeenCalled()
    const failed = await loadFootprintLandCover(paris, undefined, 6, diskFetch(undefined), { placeId: 'paris-cors', store: createMemoryStore() })
    expect(failed).toBeNull()
    const sample = prepareLandSampler({ cover: failed, near: null, far: null, weather: null }).coverAt(paris.lat, paris.lon)
    expect(sample).toEqual({ cover: null, source: 'unknown' })
  })

  it('does not poison the shared coarse promise on caller abort and retries after transient failure', async () => {
    resetLandCoverCache()
    const coarseJson = fs.readFileSync(path.join(LAND_DIR, 'coarse.json'), 'utf8')
    let coarseCalls = 0, failNext = true
    const ctrl = new AbortController()
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('coarse.json')) {
        coarseCalls++; expect(init?.signal).not.toBe(ctrl.signal)
        if (failNext) { failNext = false; return new Response(null, { status: 503 }) }
        return new Response(coarseJson, { status: 200 })
      }
      return new Response(null, { status: 404 })
    }))
    expect(await loadFootprintLandCover({ lat: 32.35, lon: 35.53 })).toBeNull(); expect(coarseCalls).toBe(1)
    const p1 = loadFootprintLandCover({ lat: 32.35, lon: 35.53 }, ctrl.signal); ctrl.abort(); expect(await p1).toBeNull()
    const p2 = await loadFootprintLandCover({ lat: 32.35, lon: 35.53 })
    expect(p2!.coverAt(32.3465, 36.17)).toBeGreaterThan(0); expect(coarseCalls).toBe(2)
  })

  it('routes malformed v4 cover cache records through cache-miss and bounds hung local reads in watcher', async () => {
    const store = createMemoryStore(), now = 1_795_000_000_000, readIfds: number[] = []
    await store.set('cover:bad-paris', { v: 4, savedAt: now, complete: true })
    await store.set('cover:bad-il', { v: 4, savedAt: now, complete: true, payload: { bbox: [1, 2] } })
    const openTiff = vi.fn(async (h: string) => (h.includes('N48E000') ? makeWorldCoverCog(48, 0, readIfds) : makeWorldCoverCog(48, 3, readIfds)))
    const paris = await loadFootprintLandCover({ lat: 48.86, lon: 2.35 }, undefined, 6, diskFetch('sas-tok'), { placeId: 'bad-paris', store, openTiff, now: () => now })
    expect(paris!.coverAt(48.86, 2.35)).toBe(5); expect(openTiff).toHaveBeenCalledTimes(2)
    openTiff.mockClear()
    const il = await loadFootprintLandCover({ lat: 32.3465, lon: 35.5325 }, undefined, 6, diskFetch(), { placeId: 'bad-il', store, openTiff, now: () => now })
    expect(il!.coverAt(32.3465, 36.17)).toBeGreaterThan(0); expect(openTiff).not.toHaveBeenCalled()

    vi.useFakeTimers()
    const coarseJson = fs.readFileSync(path.join(LAND_DIR, 'coarse.json'), 'utf8')
    const place: Place = { id: 'paris-hang', nameHe: 'פריז', regionHe: 'צרפת', lat: 48.86, lon: 2.35, timezone: 'Europe/Paris' }
    let coarseCalls = 0, sasCalls = 0, hangCoarse = true
    const updates: (LandCover | null)[] = []
    vi.stubGlobal('fetch', vi.fn((u: RequestInfo | URL) => {
      const s = String(u)
      if (s.endsWith('coarse.json')) { coarseCalls++; return hangCoarse ? new Promise<Response>(() => undefined) : Promise.resolve(new Response(coarseJson, { status: 200 })) }
      if (s === WORLDCOVER_SAS_URL) { sasCalls++; return Promise.resolve(new Response(JSON.stringify({ token: 't', 'msft:expiry': '2099-01-01T00:00:00Z' }), { status: 200 })) }
      return Promise.resolve(new Response(null, { status: 404 }))
    }))
    const watcher = createCoverWatcher(place, new AbortController().signal, (c) => updates.push(c), { store: createMemoryStore(), openTiff, timeoutMs: 100 })
    const p = watcher.check(); await vi.advanceTimersByTimeAsync(150); await p
    expect(coarseCalls).toBe(1); expect(sasCalls).toBe(1); expect(updates.at(-1)!.coverAt(48.86, 2.35)).toBe(5)
    // Shared coarse slot was released on timeout, so next regional load succeeds once coarse.json unblocks
    hangCoarse = false
    const recoveredIl = await loadFootprintLandCover({ lat: 32.3465, lon: 35.5325 }, undefined, 6, fetch, { timeoutMs: 100 })
    expect(coarseCalls).toBe(2); expect(recoveredIl!.coverAt(32.3465, 36.17)).toBeGreaterThan(0)
  })
})

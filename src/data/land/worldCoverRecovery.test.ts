import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../../config/place'
import { CogHttpError, type TiffImageLike, type TiffLike } from './cogReader'
import { encodeLand } from './grid'
import { createCoverWatcher } from './gridWatch'
import { createMemoryStore, readCachedCover } from './landCache'
import { loadFootprintLandCover, resetLandCoverCache, type LandCover } from './landData'
import { WORLDCOVER_SAS_URL } from './worldCoverCog'
import { CELLS_PER_DEG, footprintBbox, WORLDCOVER_STEP_DEG } from './worldCoverGrid'

const PARIS = { lat: 48.86, lon: 2.35 }
const BORDER: Place = { id: 'beirut', nameHe: 'ביירות', regionHe: 'לבנון', lat: 33.89, lon: 35.50, timezone: 'Asia/Beirut' }
const SAS_JSON = JSON.stringify({ token: 'tok-ok', 'msft:expiry': '2099-01-01T00:00:00Z' })

function constantCog(tLat: number, tLon: number, code: number): TiffLike {
  const img: TiffImageLike = {
    getWidth: () => 562, getHeight: () => 562, getBoundingBox: () => [tLon, tLat, tLon + 3, tLat + 3], getGeoKeys: () => ({}),
    readRasters: async ({ window: [x0, y0, x1, y1] }) => new Uint8Array((x1 - x0) * (y1 - y0)).fill(code),
  }
  return { getImageCount: async () => 1, getImage: async () => img }
}

function makeRegionalJson(bbox: [number, number, number, number], cls: number): string {
  const rows = Math.round((bbox[2] - bbox[0]) * CELLS_PER_DEG), cols = Math.round((bbox[3] - bbox[1]) * CELLS_PER_DEG)
  return JSON.stringify({ v: 1, bbox, stepDeg: WORLDCOVER_STEP_DEG, rows, cols, r: encodeLand(new Uint8Array(rows * cols).fill(cls)) })
}

const sasOnlyFetch = (): typeof fetch => (async (u) =>
  String(u) === WORLDCOVER_SAS_URL ? new Response(SAS_JSON, { status: 200 }) : new Response(null, { status: 404 })) as typeof fetch

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); resetLandCoverCache() })

describe('worldCover round-5 recovery: completion metadata, SAS deadline, cache v4, concurrent publish & all-nodata', () => {
  it('retries on focus after cold SAS 503 with partial regional overlap and skips focus once complete', async () => {
    const store = createMemoryStore(), regional = makeRegionalJson([33.0, 34.5, 34.0, 36.5], 4)
    let sasCalls = 0, sasUp = false, now = 1_795_000_000_000
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('coarse.json')) return new Response(regional, { status: 200 })
      if (url === WORLDCOVER_SAS_URL) return ++sasCalls && sasUp ? new Response(SAS_JSON, { status: 200 }) : new Response(null, { status: 503 })
      return new Response(null, { status: 404 })
    }) as unknown as typeof fetch
    const openTiff = vi.fn(async () => constantCog(33, 33, 50))
    const updates: (LandCover | null)[] = []
    const watcher = createCoverWatcher(BORDER, new AbortController().signal, (c) => updates.push(c), {
      store, fetchImpl, openTiff, now: () => now,
    })

    // 1. Cold mount: SAS fails (503) -> partial regional published, watcher MUST NOT lock out focus for 30 d
    await watcher.check()
    expect(sasCalls).toBe(1)
    expect(updates.at(-1)!.coverAt(33.50, 35.50)).toBe(4); expect(updates.at(-1)!.coverAt(34.20, 35.50)).toBe(0)
    // 2. Focus after SAS recovers -> retries SAS, completes remote footprint, covers north side
    sasUp = true
    await watcher.check()
    expect(sasCalls).toBe(2); expect(updates.at(-1)!.coverAt(34.20, 35.50)).toBe(5)
    // 3. Subsequent focus within 30 d stays quiet (0 extra SAS requests)
    now += 600_000; await watcher.check()
    expect(sasCalls).toBe(2)
  })

  it('aborts and clears a hung shared SAS fetch/body on deadline and enforces deadline on abort-ignoring injected fetch', async () => {
    vi.useFakeTimers()
    let sasCalls = 0, firstAborted = false
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === WORLDCOVER_SAS_URL) {
        sasCalls++
        if (sasCalls === 1) { init?.signal?.addEventListener('abort', () => { firstAborted = true }); return new Promise<Response>(() => undefined) }
        if (sasCalls === 2) return Promise.resolve({ ok: true, json: () => new Promise(() => undefined) } as unknown as Response)
        return Promise.resolve(new Response(SAS_JSON, { status: 200 }))
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    }))
    const openTiff = vi.fn(async (href: string) => (href.includes('N48E000') ? constantCog(48, 0, 50) : constantCog(48, 3, 10)))
    const p1 = loadFootprintLandCover(PARIS, undefined, 6, fetch, { placeId: 'sas-hang', store: createMemoryStore(), openTiff, timeoutMs: 100 })
    await vi.advanceTimersByTimeAsync(120)
    expect(await p1).toBeNull(); expect(firstAborted).toBe(true); expect(sasCalls).toBe(1)
    const p2 = loadFootprintLandCover(PARIS, undefined, 6, fetch, { placeId: 'sas-hang', store: createMemoryStore(), openTiff, timeoutMs: 100 })
    await vi.advanceTimersByTimeAsync(120)
    expect(await p2).toBeNull(); expect(sasCalls).toBe(2)
    const p3 = await loadFootprintLandCover(PARIS, undefined, 6, fetch, { placeId: 'sas-hang', store: createMemoryStore(), openTiff, timeoutMs: 100 })
    expect(sasCalls).toBe(3); expect(p3!.coverAt(48.86, 2.95)).toBe(5)
    const injectedHang = vi.fn((u: RequestInfo | URL) =>
      String(u) === WORLDCOVER_SAS_URL ? new Promise<Response>(() => undefined) : Promise.resolve(new Response(null, { status: 404 })),
    ) as unknown as typeof fetch
    const p4 = loadFootprintLandCover(PARIS, undefined, 6, injectedHang, { placeId: 'inj-hang', store: createMemoryStore(), openTiff, timeoutMs: 100 })
    await vi.advanceTimersByTimeAsync(120)
    expect(await p4).toBeNull()
  })

  it('drops legacy v3 cover records lacking completeness metadata and recovers both tiles', async () => {
    const store = createMemoryStore(), now = 1_795_000_000_000, bbox = footprintBbox(PARIS)
    const rows = Math.round((bbox[2] - bbox[0]) * CELLS_PER_DEG), cols = Math.round((bbox[3] - bbox[1]) * CELLS_PER_DEG)
    const legacy = new Uint8Array(rows * cols)
    for (let r = 0; r < rows; r++) for (let c = 0; c < Math.floor(cols / 2); c++) legacy[r * cols + c] = 5
    await store.set('cover:paris-v3', { v: 3, savedAt: now, payload: { v: 1, bbox, stepDeg: WORLDCOVER_STEP_DEG, rows, cols, r: encodeLand(legacy) } })
    expect(await readCachedCover('paris-v3', store, now)).toBeNull()

    const requested: string[] = []
    const openTiff = vi.fn(async (href: string) => {
      if (href.includes('N48E000')) { requested.push('N48E000'); return constantCog(48, 0, 50) }
      requested.push('N48E003'); return constantCog(48, 3, 10)
    })
    const recovered = await loadFootprintLandCover(PARIS, undefined, 6, sasOnlyFetch(), { placeId: 'paris-v3', store, openTiff, now: () => now })
    expect(requested.sort()).toEqual(['N48E000', 'N48E003'])
    expect(recovered!.coverAt(48.86, 3.05)).toBe(1)
    expect((await readCachedCover('paris-v3', store, now))?.complete).toBe(true)
  })

  it('publishes persisted cover before deferred coarse.json and preserves authoritative all-nodata refreshes', async () => {
    const store = createMemoryStore()
    let now = 1_795_000_000_000
    await loadFootprintLandCover(PARIS, undefined, 6, sasOnlyFetch(), {
      placeId: 'paris-nodata', store, now: () => now,
      openTiff: async (h) => (h.includes('N48E000') ? constantCog(48, 0, 50) : constantCog(48, 3, 50)),
    })

    // Advance 45 d (stale): defer coarse.json and verify cached cover publishes while coarse.json is pending
    now += 45 * 86_400_000
    let releaseCoarse!: (r: Response) => void
    const deferredFetch = (async (u: RequestInfo | URL) => {
      const url = String(u)
      if (url.endsWith('coarse.json')) return new Promise<Response>((r) => { releaseCoarse = r })
      return url === WORLDCOVER_SAS_URL ? new Response(SAS_JSON, { status: 200 }) : new Response(null, { status: 404 })
    }) as typeof fetch
    const updates: (LandCover | null)[] = []
    const refreshP = loadFootprintLandCover(PARIS, undefined, 6, deferredFetch, {
      placeId: 'paris-nodata', store, now: () => now, onUpdate: (c) => updates.push(c),
      openTiff: async (h) => (h.includes('N48E000') ? constantCog(48, 0, 0) : constantCog(48, 3, 0)),
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(updates).toHaveLength(1); expect(updates[0]!.coverAt(48.86, 2.95)).toBe(5)

    // Authoritative all-nodata refresh clears old built-up cover and updates savedAt
    releaseCoarse(new Response(null, { status: 404 }))
    const cleared = await refreshP
    expect(cleared!.coverAt(48.86, 2.95)).toBe(0); expect(cleared!.coverAt(48.86, 3.05)).toBe(0)
    const hit = await readCachedCover('paris-nodata', store, now)
    expect(hit?.complete).toBe(true); expect(hit?.fresh).toBe(true); expect(hit?.savedAt).toBe(now)

    // Contrast: when all tiles fail transiently (503), stale cache is preserved
    now += 45 * 86_400_000
    await loadFootprintLandCover(PARIS, undefined, 6, sasOnlyFetch(), {
      placeId: 'paris-nodata', store, now: () => now, openTiff: async () => { throw new CogHttpError(503) },
    })
    expect((await readCachedCover('paris-nodata', store, now))?.savedAt).toBe(now - 45 * 86_400_000)
  })
})

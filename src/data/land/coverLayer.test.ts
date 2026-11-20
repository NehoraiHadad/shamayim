import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../../config/place'
import type { TiffImageLike, TiffLike } from './cogReader'
import * as gridMod from './grid'
import { createCoverWatcher } from './gridWatch'
import { createMemoryStore, readCachedCover, writeCachedCover } from './landCache'
import { loadFootprintLandCover, loadLandCover, resetLandCoverCache, type LandCover } from './landData'
import { sampleLandAt } from './sampleLand'
import { WORLDCOVER_SAS_URL } from './worldCoverCog'
import {
  CELLS_PER_DEG, footprintBbox, isValidCoarseCoverJson, isValidLandRle, lookupCover, WORLDCOVER_STEP_DEG,
} from './worldCoverGrid'

const LAND_DIR = path.resolve('public/data/land/il')
const SHADMOT: Place = { id: 'shadmot', nameHe: 'שדמות', regionHe: 'בקעת הירדן', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem' }
const PARIS: Place = { id: 'paris', nameHe: 'פריז', regionHe: 'צרפת', lat: 48.86, lon: 2.35, timezone: 'Europe/Paris' }
const SAS_JSON = JSON.stringify({ token: 'tok', 'msft:expiry': '2099-01-01T00:00:00Z' })

function constantCog(tLat: number, tLon: number, code: number): TiffLike {
  const img: TiffImageLike = {
    getWidth: () => 562, getHeight: () => 562, getBoundingBox: () => [tLon, tLat, tLon + 3, tLat + 3], getGeoKeys: () => ({}),
    readRasters: async ({ window: [x0, y0, x1, y1] }) => new Uint8Array((x1 - x0) * (y1 - y0)).fill(code),
  }
  return { getImageCount: async () => 1, getImage: async () => img }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); resetLandCoverCache() })

describe('WorldCover validation, near-tile retry, provenance and shared fine-tile cache', () => {
  it('rejects malformed RLE, invalid classes, wrong version, mismatched geometry and huge grids in v4 cache', async () => {
    expect(isValidLandRle('', 4)).toBe(false)
    expect(isValidLandRle('z4', 4)).toBe(false)       // class 25 > 10
    expect(isValidLandRle('a04', 4)).toBe(false)      // leading zero
    expect(isValidLandRle('a3', 4)).toBe(false)       // truncated
    expect(isValidLandRle('a5', 4)).toBe(false)       // overlong
    expect(isValidLandRle('ab2k', 4)).toBe(true)      // classes 0, 1, 1, 10

    const validBase = { v: 1, bbox: [32.0, 35.0, 32.02, 35.02] as [number, number, number, number], stepDeg: 0.01, rows: 2, cols: 2, r: 'e4' }
    expect(isValidCoarseCoverJson(validBase)).toBe(true)
    expect(isValidCoarseCoverJson({ ...validBase, v: 2 })).toBe(false)
    expect(isValidCoarseCoverJson({ ...validBase, r: '' })).toBe(false)
    expect(isValidCoarseCoverJson({ ...validBase, r: 'z4' })).toBe(false)
    expect(isValidCoarseCoverJson({ ...validBase, rows: 3 })).toBe(false) // geometry mismatch
    expect(isValidCoarseCoverJson({ v: 1, bbox: [0, 0, 10, 10], stepDeg: 0.01, rows: 1000, cols: 1000, r: 'a1000000' })).toBe(false)

    // Corrupt raster contents inside an otherwise valid v4 cover record must be rejected & trigger recovery
    const store = createMemoryStore(), now = 1_795_000_000_000, bbox = footprintBbox(PARIS)
    const rows = Math.round((bbox[2] - bbox[0]) * CELLS_PER_DEG), cols = Math.round((bbox[3] - bbox[1]) * CELLS_PER_DEG)
    await store.set('cover:paris', { v: 4, savedAt: now, complete: true, payload: { v: 1, bbox, stepDeg: WORLDCOVER_STEP_DEG, rows, cols, r: '' } })
    expect(await readCachedCover('paris', store, now)).toBeNull()
    await store.set('cover:paris', { v: 4, savedAt: now, complete: true, payload: { v: 1, bbox, stepDeg: WORLDCOVER_STEP_DEG, rows, cols, r: `z${rows * cols}` } })
    const openTiff = vi.fn(async (h: string) => (h.includes('N48E000') ? constantCog(48, 0, 50) : constantCog(48, 3, 10)))
    const sasFetch = (async (u: RequestInfo | URL) =>
      String(u) === WORLDCOVER_SAS_URL ? new Response(SAS_JSON, { status: 200 }) : new Response(null, { status: 404 })) as typeof fetch
    const recovered = await loadFootprintLandCover(PARIS, undefined, 6, sasFetch, { placeId: 'paris', store, openTiff, now: () => now })
    expect(openTiff).toHaveBeenCalledTimes(2)
    expect(lookupCover(recovered, PARIS.lat, PARIS.lon)).toEqual({ cover: 5, source: 'worldcover-2021:remote-1km' })
  })

  it('retries failed high-res near tiles on focus while regional or cached coarse cover remains available', async () => {
    const store = createMemoryStore(), now = 1_795_000_000_000
    let failNear = true, tileFetches = 0
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const name = path.basename(String(input))
      if (name === '323_355.json') {
        tileFetches++
        if (failNear) return new Response(null, { status: 503 })
      }
      const full = path.join(LAND_DIR, name)
      return fs.existsSync(full) ? new Response(fs.readFileSync(full, 'utf8'), { status: 200 }) : new Response(null, { status: 404 })
    }) as typeof fetch

    const updates: (LandCover | null)[] = []
    const watcher = createCoverWatcher(SHADMOT, new AbortController().signal, (c) => updates.push(c), { store, fetchImpl, now: () => now })

    // 1. Near tile 503 while regional coarse.json succeeds -> regional-1km published, NOT locked out for 30 d
    await watcher.check()
    expect(tileFetches).toBe(1)
    expect(lookupCover(updates.at(-1)!, SHADMOT.lat, SHADMOT.lon).source).toBe('worldcover-2021:regional-1km')

    // 2. Focus after tile recovers -> retries near tile and upgrades to local-50m; far stays regional-1km
    failNear = false
    await watcher.check()
    expect(tileFetches).toBe(2)
    expect(lookupCover(updates.at(-1)!, SHADMOT.lat, SHADMOT.lon).source).toBe('worldcover-2021:local-50m')
    expect(lookupCover(updates.at(-1)!, 32.3465, 36.17).source).toBe('worldcover-2021:regional-1km')
    expect(lookupCover(updates.at(-1)!, 32.10, 34.05)).toEqual({ cover: null, source: 'unknown' })
    const s = sampleLandAt({ cover: updates.at(-1)!, near: null, far: null, weather: null }, SHADMOT.lat, SHADMOT.lon, 11, -175)
    expect(s.coverSource).toBe('worldcover-2021:local-50m')

    // 3. Subsequent focus stays quiet once both near and coarse are complete
    await watcher.check()
    expect(tileFetches).toBe(2)

    // 4. Fresh cached remote coarse mosaic + transient index 503 still retries on focus
    const parisStore = createMemoryStore(), pBbox = footprintBbox(PARIS)
    const pRows = Math.round((pBbox[2] - pBbox[0]) * CELLS_PER_DEG), pCols = Math.round((pBbox[3] - pBbox[1]) * CELLS_PER_DEG)
    await writeCachedCover('paris', {
      v: 1, bbox: pBbox, stepDeg: WORLDCOVER_STEP_DEG, rows: pRows, cols: pCols, r: gridMod.encodeLand(new Uint8Array(pRows * pCols).fill(5)), complete: true,
    }, parisStore, now)
    let indexCalls = 0, indexUp = false
    const cachedFetch = (async (u: RequestInfo | URL) => {
      if (String(u).endsWith('index.json')) { indexCalls++; return indexUp ? new Response(JSON.stringify({ cells: [] }), { status: 200 }) : new Response(null, { status: 503 }) }
      return new Response(null, { status: 404 })
    }) as typeof fetch
    const pUpdates: (LandCover | null)[] = []
    const pWatch = createCoverWatcher(PARIS, new AbortController().signal, (c) => pUpdates.push(c), { store: parisStore, fetchImpl: cachedFetch, now: () => now })
    await pWatch.check()
    expect(indexCalls).toBe(1); expect(lookupCover(pUpdates.at(-1)!, PARIS.lat, PARIS.lon)).toEqual({ cover: 5, source: 'worldcover-2021:remote-1km' })
    indexUp = true
    await pWatch.check()
    expect(indexCalls).toBe(2)
    await pWatch.check()
    expect(indexCalls).toBe(2)
  })

  it('shares fine tile fetch and RLE decode across concurrent 2 km and 6 km cold-mount loaders', async () => {
    const fetchCounts = new Map<string, number>()
    const decodeSpy = vi.spyOn(gridMod, 'decodeLand')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const name = path.basename(String(input))
      fetchCounts.set(name, (fetchCounts.get(name) ?? 0) + 1)
      const full = path.join(LAND_DIR, name)
      return fs.existsSync(full) ? new Response(fs.readFileSync(full, 'utf8'), { status: 200 }) : new Response(null, { status: 404 })
    }))

    // Simulate cold mount: App useLandCover(2 km) + useLand(6 km footprint) + CanvasScene(6 km) concurrently
    const [portrait, scene6, footprint] = await Promise.all([
      loadLandCover(SHADMOT, undefined, 2),
      loadLandCover(SHADMOT, undefined, 6),
      loadFootprintLandCover(SHADMOT, undefined, 6),
    ])
    expect(portrait).not.toBeNull(); expect(scene6).not.toBeNull(); expect(footprint).not.toBeNull()
    expect(fetchCounts.get('index.json')).toBe(1)
    expect(fetchCounts.get('coarse.json')).toBe(1)
    const tileEntries = [...fetchCounts.entries()].filter(([k]) => /^\d+_\d+\.json$/.test(k))
    expect(tileEntries.length).toBeGreaterThanOrEqual(4)
    for (const [, count] of tileEntries) expect(count).toBe(1)
    // Exact 1 RLE decode per fine tile + 1 for coarse.json (zero duplicate decodes across the 3 callers)
    expect(decodeSpy).toHaveBeenCalledTimes(tileEntries.length + 1)
    // Portrait loader preserves its 2 km tile radius (does not include a neighboring 5.7 km south tile)
    expect(portrait!.coverAt(SHADMOT.lat, SHADMOT.lon)).toBeGreaterThan(0)
    expect(scene6!.coverAt(32.295, 35.5325)).toBeGreaterThan(0)
    expect(portrait!.coverAt(32.295, 35.5325)).toBe(0)
  })
})

import type { Coordinate } from '../landmarks/project'
import { isValidLandRle, type LandCover } from './coverCodec'
import { decodeLand, LAND_N, LAND_STEP } from './grid'
import { raceAbort, withDeadline } from './worldCoverSas'

/**
 * Shared loader and bounded LRU tile cache for high-resolution 50 m static WorldCover tiles
 * (`public/data/land/il/<row>_<col>.json`). Concurrent callers (`useLandCover` 2 km, `useLand`
 * 6 km, `CanvasScene` 6 km) share one fetch, JSON parse and RLE decode per tile while preserving
 * independent radii and retryability on transient failures.
 */
export const LAND_ROOT = `${import.meta.env.BASE_URL}data/land/il`
export const LOCAL_ASSET_TIMEOUT_MS = 5_000
const MAX_CACHED_TILES = 64

type IndexOutcome = { status: 'ok'; cells: string[] } | { status: 'absent' } | { status: 'failed' }
export interface NearCoverResult { cover: LandCover | null; status: 'ok' | 'outside' | 'failed' }

let indexPromise: Promise<IndexOutcome> | undefined
const tileCache = new Map<string, Promise<Uint8Array | null>>()

/** Clears shared index and fine-tile caches (for offline tests). */
export function resetFineCoverCache(): void {
  indexPromise = undefined
  tileCache.clear()
}

/** Signal-independent bounded shared loader; aborts and clears its slot on timeout/failure. */
export async function loadShared<T>(
  useCache: boolean, getSlot: () => Promise<T | null> | undefined, setSlot: (p: Promise<T | null> | undefined) => void,
  fetcher: (sig: AbortSignal) => Promise<T | null>, signal?: AbortSignal, timeoutMs = LOCAL_ASSET_TIMEOUT_MS,
): Promise<T | null> {
  if (signal?.aborted) return null
  let p = useCache ? getSlot() : undefined
  if (!p) {
    const next = withDeadline(fetcher, timeoutMs).then((res) => {
      if (res === null && useCache && getSlot() === next) setSlot(undefined)
      return res
    })
    if (useCache) setSlot(next)
    p = next
  }
  return signal ? raceAbort(p, signal).catch(() => null) : p
}

async function loadIndex(fetchImpl: typeof fetch, signal?: AbortSignal, timeoutMs = LOCAL_ASSET_TIMEOUT_MS): Promise<IndexOutcome> {
  if (signal?.aborted) return { status: 'failed' }
  const useCache = fetchImpl === fetch
  let p = useCache ? indexPromise : undefined
  if (!p) {
    const next = withDeadline<IndexOutcome>(async (sig) => {
      const r = await fetchImpl(`${LAND_ROOT}/index.json`, { signal: sig })
      if (r.status === 404) return { status: 'absent' }
      if (!r.ok) return { status: 'failed' }
      const json = (await r.json()) as { cells?: unknown }
      if (!Array.isArray(json?.cells) || !json.cells.every((c) => typeof c === 'string')) return { status: 'failed' }
      return { status: 'ok', cells: json.cells }
    }, timeoutMs).then((res) => {
      const out: IndexOutcome = res ?? { status: 'failed' }
      if (out.status === 'failed' && useCache && indexPromise === next) indexPromise = undefined
      return out
    })
    if (useCache) indexPromise = next
    p = next
  }
  return signal ? raceAbort(p, signal).catch(() => ({ status: 'failed' as const })) : p
}

function loadFineTile(key: string, fetchImpl: typeof fetch, signal?: AbortSignal, timeoutMs = LOCAL_ASSET_TIMEOUT_MS): Promise<Uint8Array | null> {
  if (signal?.aborted) return Promise.resolve(null)
  const useCache = fetchImpl === fetch
  let p = useCache ? tileCache.get(key) : undefined
  if (p && useCache) { tileCache.delete(key); tileCache.set(key, p) }
  if (!p) {
    const next = withDeadline(async (sig) => {
      const res = await fetchImpl(`${LAND_ROOT}/${key}.json`, { signal: sig })
      if (!res.ok) return null
      const json = (await res.json()) as { r?: unknown }
      const expected = LAND_N * LAND_N
      if (typeof json?.r !== 'string' || !isValidLandRle(json.r, expected)) return null
      return decodeLand(json.r, expected)
    }, timeoutMs).then((grid) => {
      if (grid === null && useCache && tileCache.get(key) === next) tileCache.delete(key)
      return grid
    })
    if (useCache) {
      if (tileCache.size >= MAX_CACHED_TILES) tileCache.delete(tileCache.keys().next().value!)
      tileCache.set(key, next)
    }
    p = next
  }
  return signal ? raceAbort(p, signal).catch(() => null) : p
}

/** Loads 50 m static fine tiles within `radiusKm`, distinguishing authoritative absence from transient failures. */
export async function loadNearCoverResult(
  place: Coordinate, signal?: AbortSignal, radiusKm = 6, fetchImpl: typeof fetch = fetch, timeoutMs = LOCAL_ASSET_TIMEOUT_MS,
): Promise<NearCoverResult> {
  const index = await loadIndex(fetchImpl, signal, timeoutMs)
  if (signal?.aborted) return { cover: null, status: 'failed' }
  if (index.status === 'absent') return { cover: null, status: 'outside' }
  if (index.status === 'failed') return { cover: null, status: 'failed' }
  const available = new Set(index.cells)
  const dLat = radiusKm / 111.32, dLon = radiusKm / (111.32 * Math.cos((place.lat * Math.PI) / 180))
  const keys: string[] = []
  for (let row = Math.floor((place.lat - dLat) * 10); row <= Math.floor((place.lat + dLat) * 10); row++) {
    for (let col = Math.floor((place.lon - dLon) * 10); col <= Math.floor((place.lon + dLon) * 10); col++) {
      if (available.has(`${row}_${col}`)) keys.push(`${row}_${col}`)
    }
  }
  if (!keys.length) return { cover: null, status: 'outside' }
  const loaded = await Promise.all(keys.map(async (key) => [key, await loadFineTile(key, fetchImpl, signal, timeoutMs)] as const))
  if (signal?.aborted) return { cover: null, status: 'failed' }
  const byNumber = new Map<number, Uint8Array>()
  let missingAny = false
  for (const [key, grid] of loaded) {
    if (!grid) { missingAny = true; continue }
    const [row, col] = key.split('_').map(Number)
    byNumber.set(row * 10_000 + col, grid)
  }
  if (!byNumber.size) return { cover: null, status: 'failed' }
  const coverAt = (lat: number, lon: number): number => {
    const grid = byNumber.get(Math.floor(lat * 10) * 10_000 + Math.floor(lon * 10))
    if (!grid) return 0
    const row = LAND_N - 1 - Math.floor((lat - Math.floor(lat * 10) / 10) / LAND_STEP)
    const col = Math.floor((lon - Math.floor(lon * 10) / 10) / LAND_STEP)
    return grid[Math.max(0, Math.min(LAND_N - 1, row)) * LAND_N + Math.max(0, Math.min(LAND_N - 1, col))]
  }
  const cover: LandCover = {
    coverAt,
    coverWithSourceAt(lat, lon) {
      const cls = coverAt(lat, lon)
      return cls > 0 ? { cover: cls, source: 'worldcover-2021:local-50m' } : { cover: null, source: 'unknown' }
    },
  }
  return { cover, status: missingAny ? 'failed' : 'ok' }
}

/** The high-res 50 m land-cover cells within `radiusKm` of a place, or null outside/unavailable. */
export async function loadLandCover(
  place: Coordinate, signal?: AbortSignal, radiusKm = 6, fetchImpl: typeof fetch = fetch, timeoutMs = LOCAL_ASSET_TIMEOUT_MS,
): Promise<LandCover | null> {
  const res = await loadNearCoverResult(place, signal, radiusKm, fetchImpl, timeoutMs)
  return res.status === 'ok' ? res.cover : null
}

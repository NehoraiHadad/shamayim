import type { Coordinate } from '../landmarks/project'
import type { OpenTiffFn } from './cogReader'
import { decodeLand, LAND_N, LAND_STEP } from './grid'
import { COVER_PARTIAL_TTL_MS, COVER_TTL_MS, readCachedCover, writeCachedCover, type LandCacheStore } from './landCache'
import { fetchCoarseWorldCoverCog } from './worldCoverCog'
import {
  bboxCoveredBy, bboxIntersects, coarseCoverFromJson, combineLandCovers, footprintBbox,
  type Bbox, type CoarseCoverJson,
} from './worldCoverGrid'
import { resetWorldCoverSasCache } from './worldCoverSas'

const ROOT = `${import.meta.env.BASE_URL}data/land/il`
let indexPromise: Promise<{ cells: string[] } | null> | undefined
let coarsePromise: Promise<RegionalCoarse | null> | undefined

/** Clears module-level shared index, coarse and SAS caches (for offline tests). */
export function resetLandCoverCache(): void {
  indexPromise = undefined; coarsePromise = undefined; resetWorldCoverSasCache()
}

/** What covers the ground at a point (index into `COVER`; `0` where unknown or outside loaded coverage). */
export interface LandCover { coverAt: (lat: number, lon: number) => number }
export interface FootprintCoverResult {
  cover: LandCover | null; complete: boolean; nextCheckAt: number | null
}
interface RegionalCoarse { bbox: Bbox; cover: LandCover }
export interface FootprintCoverOpts {
  placeId?: string; store?: LandCacheStore; openTiff?: OpenTiffFn; now?: () => number
  timeoutMs?: number; onUpdate?: (cover: LandCover | null) => void
}

/** Signal-independent shared loader that clears its cached slot on failure so later callers can retry. */
async function loadShared<T>(
  useCache: boolean, getSlot: () => Promise<T | null> | undefined, setSlot: (p: Promise<T | null> | undefined) => void,
  fetcher: () => Promise<T | null>, signal?: AbortSignal,
): Promise<T | null> {
  if (signal?.aborted) return null
  const run = async (): Promise<T | null> => {
    try { const res = await fetcher(); if (res === null && useCache) setSlot(undefined); return res }
    catch { if (useCache) setSlot(undefined); return null }
  }
  const p = useCache ? (getSlot() ?? (() => { const next = run(); setSlot(next); return next })()) : run()
  const value = await p
  return signal?.aborted ? null : value
}

/** The high-res 50 m land-cover cells within `radiusKm` of a place, or null outside the static Israel tiles. */
export async function loadLandCover(
  place: Coordinate, signal?: AbortSignal, radiusKm = 6, fetchImpl: typeof fetch = fetch,
): Promise<LandCover | null> {
  const index = await loadShared(
    fetchImpl === fetch, () => indexPromise, (p) => { indexPromise = p },
    async () => { const r = await fetchImpl(`${ROOT}/index.json`); return r.ok ? ((await r.json()) as { cells: string[] }) : null },
    signal,
  )
  if (!index || signal?.aborted) return null
  const available = new Set(index.cells)
  const dLat = radiusKm / 111.32, dLon = radiusKm / (111.32 * Math.cos((place.lat * Math.PI) / 180))
  const keys: string[] = []
  for (let row = Math.floor((place.lat - dLat) * 10); row <= Math.floor((place.lat + dLat) * 10); row++) {
    for (let col = Math.floor((place.lon - dLon) * 10); col <= Math.floor((place.lon + dLon) * 10); col++) {
      if (available.has(`${row}_${col}`)) keys.push(`${row}_${col}`)
    }
  }
  if (!keys.length) return null
  const byNumber = new Map(await Promise.all(keys.map(async (key) => {
    const response = await fetchImpl(`${ROOT}/${key}.json`, { signal })
    if (!response.ok) throw new Error(`Land cell HTTP ${response.status}`)
    const [row, col] = key.split('_').map(Number)
    return [row * 10_000 + col, decodeLand(((await response.json()) as { r: string }).r)] as const
  })))
  return {
    coverAt(lat, lon) {
      const grid = byNumber.get(Math.floor(lat * 10) * 10_000 + Math.floor(lon * 10))
      if (!grid) return 0
      const row = LAND_N - 1 - Math.floor((lat - Math.floor(lat * 10) / 10) / LAND_STEP)
      const col = Math.floor((lon - Math.floor(lon * 10) / 10) / LAND_STEP)
      return grid[Math.max(0, Math.min(LAND_N - 1, row)) * LAND_N + Math.max(0, Math.min(LAND_N - 1, col))]
    },
  }
}

const loadRegionalCoarse = (signal?: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<RegionalCoarse | null> =>
  loadShared(fetchImpl === fetch, () => coarsePromise, (p) => { coarsePromise = p }, async () => {
    const res = await fetchImpl(`${ROOT}/coarse.json`)
    if (!res.ok) return null
    const raw = (await res.json()) as CoarseCoverJson
    return { bbox: raw.bbox, cover: coarseCoverFromJson(raw) }
  }, signal)

/** Loads ±6 km near + ±60 km far WorldCover with completion metadata, publishing persisted cover concurrently. */
export async function loadFootprintLandCoverResult(
  place: Coordinate, signal?: AbortSignal, nearRadiusKm = 6,
  fetchImpl: typeof fetch = fetch, opts: FootprintCoverOpts = {},
): Promise<FootprintCoverResult> {
  const clock = opts.now ?? Date.now, empty: FootprintCoverResult = { cover: null, complete: false, nextCheckAt: null }
  let localDone = false, publishedCached = false
  const nearP = loadLandCover(place, signal, nearRadiusKm, fetchImpl).catch(() => null)
  const regionalP = loadRegionalCoarse(signal, fetchImpl).catch(() => null)
  const hitP = opts.placeId ? readCachedCover(opts.placeId, opts.store, clock()).catch(() => null) : Promise.resolve(null)
  const cachedCoverP = hitP.then((hit) => {
    if (!hit || signal?.aborted) return null
    const cover = coarseCoverFromJson(hit.value)
    if (!localDone) { publishedCached = true; opts.onUpdate?.(cover) }
    return cover
  })
  const [near, regional] = await Promise.all([nearP, regionalP])
  localDone = true
  if (signal?.aborted) return empty
  const fp = footprintBbox(place)
  if (regional && bboxCoveredBy(fp, regional.bbox)) {
    const cover = combineLandCovers(near, regional.cover)
    opts.onUpdate?.(cover)
    return { cover, complete: true, nextCheckAt: clock() + COVER_TTL_MS }
  }
  const localRegional = regional && bboxIntersects(fp, regional.bbox) ? regional.cover : null
  const [hit, cachedCover] = await Promise.all([hitP, cachedCoverP])
  if (signal?.aborted) return empty
  const initial = combineLandCovers(near, combineLandCovers(localRegional, cachedCover))
  const coversFootprint = Boolean(hit && bboxCoveredBy(fp, hit.value.bbox))
  if (initial && (!publishedCached || near || localRegional)) opts.onUpdate?.(initial)
  if (hit?.fresh && coversFootprint) {
    return { cover: initial, complete: hit.complete, nextCheckAt: hit.savedAt + (hit.complete ? COVER_TTL_MS : COVER_PARTIAL_TTL_MS) }
  }
  const retryOnly = Boolean(hit && coversFootprint && !hit.complete && hit.value.missingTiles?.length && clock() - hit.savedAt <= COVER_TTL_MS)
  const fresh = await fetchCoarseWorldCoverCog(
    place, signal, { fetchImpl, openTiff: opts.openTiff, now: clock, timeoutMs: opts.timeoutMs },
    { base: hit?.value, onlyTiles: retryOnly ? new Set(hit!.value.missingTiles!) : undefined },
  ).catch(() => null)
  if (signal?.aborted) return empty
  if (fresh) {
    const complete = fresh.complete === true && !fresh.missingTiles?.length
    const savedAt = hit && coversFootprint && (retryOnly || !complete) ? hit.savedAt : clock()
    if (opts.placeId) await writeCachedCover(opts.placeId, fresh, opts.store, savedAt).catch(() => undefined)
    if (signal?.aborted) return empty
    const next = combineLandCovers(near, combineLandCovers(localRegional, coarseCoverFromJson(fresh)))
    opts.onUpdate?.(next)
    const until = savedAt + (complete ? COVER_TTL_MS : COVER_PARTIAL_TTL_MS)
    return { cover: next, complete, nextCheckAt: until > clock() ? until : null }
  }
  if (!publishedCached && !initial) opts.onUpdate?.(null)
  return { cover: initial, complete: false, nextCheckAt: null }
}

export async function loadFootprintLandCover(
  place: Coordinate, signal?: AbortSignal, nearRadiusKm = 6,
  fetchImpl: typeof fetch = fetch, opts: FootprintCoverOpts = {},
): Promise<LandCover | null> {
  return (await loadFootprintLandCoverResult(place, signal, nearRadiusKm, fetchImpl, opts)).cover
}

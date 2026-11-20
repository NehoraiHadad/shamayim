import type { Coordinate } from '../landmarks/project'
import type { OpenTiffFn } from './cogReader'
import { decodeLand, LAND_N, LAND_STEP } from './grid'
import { COVER_PARTIAL_TTL_MS, COVER_TTL_MS, readCachedCover, writeCachedCover, type LandCacheStore } from './landCache'
import { fetchCoarseWorldCoverCog } from './worldCoverCog'
import {
  bboxCoveredBy, bboxIntersects, coarseCoverFromJson, combineLandCovers, footprintBbox,
  isValidCoarseCoverJson, type Bbox,
} from './worldCoverGrid'
import { raceAbort, resetWorldCoverSasCache, withDeadline } from './worldCoverSas'

const ROOT = `${import.meta.env.BASE_URL}data/land/il`
const LOCAL_ASSET_TIMEOUT_MS = 5_000
let indexPromise: Promise<{ cells: string[] } | null> | undefined
let coarsePromise: Promise<RegionalCoarse | null> | undefined

/** Clears module-level shared index, coarse and SAS caches (for offline tests). */
export function resetLandCoverCache(): void {
  indexPromise = undefined; coarsePromise = undefined; resetWorldCoverSasCache()
}

/** What covers the ground at a point (index into `COVER`; `0` where unknown or outside loaded coverage). */
export interface LandCover { coverAt: (lat: number, lon: number) => number }
export interface FootprintCoverResult { cover: LandCover | null; complete: boolean; nextCheckAt: number | null }
interface RegionalCoarse { bbox: Bbox; cover: LandCover }
export interface FootprintCoverOpts {
  placeId?: string; store?: LandCacheStore; openTiff?: OpenTiffFn; now?: () => number
  timeoutMs?: number; onUpdate?: (cover: LandCover | null) => void
}

/** Signal-independent bounded shared loader; aborts and clears its slot on timeout/failure so retries proceed. */
async function loadShared<T>(
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

/** The high-res 50 m land-cover cells within `radiusKm` of a place, or null outside the static Israel tiles. */
export async function loadLandCover(
  place: Coordinate, signal?: AbortSignal, radiusKm = 6, fetchImpl: typeof fetch = fetch, timeoutMs = LOCAL_ASSET_TIMEOUT_MS,
): Promise<LandCover | null> {
  const index = await loadShared(
    fetchImpl === fetch, () => indexPromise, (p) => { indexPromise = p },
    async (sig) => { const r = await fetchImpl(`${ROOT}/index.json`, { signal: sig }); return r.ok ? ((await r.json()) as { cells: string[] }) : null },
    signal, timeoutMs,
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
  const byNumber = await withDeadline(async (sig) => new Map(await Promise.all(keys.map(async (key) => {
    const res = await fetchImpl(`${ROOT}/${key}.json`, { signal: sig })
    if (!res.ok) throw new Error(`Land cell HTTP ${res.status}`)
    const [row, col] = key.split('_').map(Number)
    return [row * 10_000 + col, decodeLand(((await res.json()) as { r: string }).r)] as const
  }))), timeoutMs, signal)
  if (!byNumber) return null
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

const loadRegionalCoarse = (signal?: AbortSignal, fetchImpl: typeof fetch = fetch, timeoutMs = LOCAL_ASSET_TIMEOUT_MS) =>
  loadShared<RegionalCoarse>(fetchImpl === fetch, () => coarsePromise, (p) => { coarsePromise = p }, async (sig) => {
    const res = await fetchImpl(`${ROOT}/coarse.json`, { signal: sig })
    if (!res.ok) return null
    const raw = (await res.json()) as unknown
    return isValidCoarseCoverJson(raw) ? { bbox: raw.bbox, cover: coarseCoverFromJson(raw) } : null
  }, signal, timeoutMs)

/** Loads ±6 km near + ±60 km far WorldCover with completion metadata, publishing persisted cover concurrently. */
export async function loadFootprintLandCoverResult(
  place: Coordinate, signal?: AbortSignal, nearRadiusKm = 6,
  fetchImpl: typeof fetch = fetch, opts: FootprintCoverOpts = {},
): Promise<FootprintCoverResult> {
  const clock = opts.now ?? Date.now, empty: FootprintCoverResult = { cover: null, complete: false, nextCheckAt: null }
  const localMs = opts.timeoutMs && opts.timeoutMs > 0 ? Math.min(LOCAL_ASSET_TIMEOUT_MS, opts.timeoutMs) : LOCAL_ASSET_TIMEOUT_MS
  let localDone = false, publishedCached = false
  const nearP = loadLandCover(place, signal, nearRadiusKm, fetchImpl, localMs).catch(() => null)
  const regionalP = loadRegionalCoarse(signal, fetchImpl, localMs).catch(() => null)
  const hitP = opts.placeId ? readCachedCover(opts.placeId, opts.store, clock()).catch(() => null) : Promise.resolve(null)
  const cachedCoverP = hitP.then((hit) => {
    if (!hit || signal?.aborted) return null
    const cover = coarseCoverFromJson(hit.value)
    if (!localDone) { publishedCached = true; opts.onUpdate?.(cover) }
    return cover
  }).catch(() => null)
  const [near, regional] = await Promise.all([nearP, regionalP])
  localDone = true
  if (signal?.aborted) return empty
  const fp = footprintBbox(place)
  if (regional && bboxCoveredBy(fp, regional.bbox)) {
    const cover = combineLandCovers(near, regional.cover); opts.onUpdate?.(cover)
    return { cover, complete: true, nextCheckAt: clock() + COVER_TTL_MS }
  }
  const localRegional = regional && bboxIntersects(fp, regional.bbox) ? regional.cover : null
  const [hit, cachedCover] = await Promise.all([hitP, cachedCoverP])
  if (signal?.aborted) return empty
  const initial = combineLandCovers(near, combineLandCovers(localRegional, cachedCover))
  const coversFootprint = Boolean(hit && cachedCover && bboxCoveredBy(fp, hit.value.bbox))
  if (initial && (!publishedCached || near || localRegional)) opts.onUpdate?.(initial)
  if (hit?.fresh && coversFootprint) {
    return { cover: initial, complete: hit.complete, nextCheckAt: hit.savedAt + (hit.complete ? COVER_TTL_MS : COVER_PARTIAL_TTL_MS) }
  }
  const retryOnly = Boolean(hit && coversFootprint && !hit.complete && hit.value.missingTiles?.length && clock() - hit.savedAt <= COVER_TTL_MS)
  const fresh = await fetchCoarseWorldCoverCog(
    place, signal, { fetchImpl, openTiff: opts.openTiff, now: clock, timeoutMs: opts.timeoutMs },
    { base: coversFootprint ? hit?.value : undefined, onlyTiles: retryOnly ? new Set(hit!.value.missingTiles!) : undefined },
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

export const loadFootprintLandCover = async (
  place: Coordinate, signal?: AbortSignal, nearRadiusKm = 6, fetchImpl: typeof fetch = fetch, opts: FootprintCoverOpts = {},
): Promise<LandCover | null> => (await loadFootprintLandCoverResult(place, signal, nearRadiusKm, fetchImpl, opts)).cover

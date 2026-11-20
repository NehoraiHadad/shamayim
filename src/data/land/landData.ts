import type { Coordinate } from '../landmarks/project'
import type { OpenTiffFn } from './cogReader'
import type { CoverSource, LandCover } from './coverCodec'
import { LAND_ROOT, loadLandCover, loadNearCoverResult, loadShared, LOCAL_ASSET_TIMEOUT_MS, resetFineCoverCache } from './fineCover'
import { COVER_PARTIAL_TTL_MS, COVER_TTL_MS, readCachedCover, writeCachedCover, type LandCacheStore } from './landCache'
import { fetchCoarseWorldCoverCog } from './worldCoverCog'
import {
  bboxCoveredBy, bboxIntersects, coarseCoverFromJson, combineLandCovers, footprintBbox,
  isValidCoarseCoverJson, type Bbox,
} from './worldCoverGrid'
import { resetWorldCoverSasCache } from './worldCoverSas'

export { loadLandCover, type CoverSource, type LandCover }

let coarsePromise: Promise<RegionalCoarse | null> | undefined

/** Clears module-level shared index, fine-tile, coarse and SAS caches (for offline tests). */
export function resetLandCoverCache(): void {
  resetFineCoverCache()
  coarsePromise = undefined
  resetWorldCoverSasCache()
}

export interface FootprintCoverResult { cover: LandCover | null; complete: boolean; nextCheckAt: number | null }
interface RegionalCoarse { bbox: Bbox; cover: LandCover }
export interface FootprintCoverOpts {
  placeId?: string; store?: LandCacheStore; openTiff?: OpenTiffFn; now?: () => number
  timeoutMs?: number; onUpdate?: (cover: LandCover | null) => void
}

const loadRegionalCoarse = (signal?: AbortSignal, fetchImpl: typeof fetch = fetch, timeoutMs = LOCAL_ASSET_TIMEOUT_MS) =>
  loadShared<RegionalCoarse>(fetchImpl === fetch, () => coarsePromise, (p) => { coarsePromise = p }, async (sig) => {
    const res = await fetchImpl(`${LAND_ROOT}/coarse.json`, { signal: sig })
    if (!res.ok) return null
    const raw = (await res.json()) as unknown
    return isValidCoarseCoverJson(raw) ? { bbox: raw.bbox, cover: coarseCoverFromJson(raw, 'regional-1km') } : null
  }, signal, timeoutMs)

/**
 * Loads ±6 km high-res near + ±60 km coarse WorldCover with independent completion metadata.
 * Publishes persisted cover concurrently before local assets finish, and tracks transient near-tile
 * failures separately so coarse availability never suppresses focus retries for 30 days.
 */
export async function loadFootprintLandCoverResult(
  place: Coordinate, signal?: AbortSignal, nearRadiusKm = 6,
  fetchImpl: typeof fetch = fetch, opts: FootprintCoverOpts = {},
): Promise<FootprintCoverResult> {
  const clock = opts.now ?? Date.now, empty: FootprintCoverResult = { cover: null, complete: false, nextCheckAt: null }
  const localMs = opts.timeoutMs && opts.timeoutMs > 0 ? Math.min(LOCAL_ASSET_TIMEOUT_MS, opts.timeoutMs) : LOCAL_ASSET_TIMEOUT_MS
  let localDone = false, publishedCached = false
  const nearP = loadNearCoverResult(place, signal, nearRadiusKm, fetchImpl, localMs).catch(() => ({ cover: null, status: 'failed' as const }))
  const regionalP = loadRegionalCoarse(signal, fetchImpl, localMs).catch(() => null)
  const hitP = opts.placeId ? readCachedCover(opts.placeId, opts.store, clock()).catch(() => null) : Promise.resolve(null)
  const cachedCoverP = hitP.then((hit) => {
    if (!hit || signal?.aborted) return null
    const cover = coarseCoverFromJson(hit.value, 'remote-1km')
    if (!localDone) { publishedCached = true; opts.onUpdate?.(cover) }
    return cover
  }).catch(() => null)

  const [nearRes, regional] = await Promise.all([nearP, regionalP])
  localDone = true
  if (signal?.aborted) return empty
  const near = nearRes.cover
  const nearFailed = nearRes.status === 'failed'
  const fp = footprintBbox(place)

  if (regional && bboxCoveredBy(fp, regional.bbox)) {
    const cover = combineLandCovers(near, regional.cover); opts.onUpdate?.(cover)
    return { cover, complete: !nearFailed, nextCheckAt: nearFailed ? null : clock() + COVER_TTL_MS }
  }
  const localRegional = regional && bboxIntersects(fp, regional.bbox) ? regional.cover : null
  const [hit, cachedCover] = await Promise.all([hitP, cachedCoverP])
  if (signal?.aborted) return empty
  const initial = combineLandCovers(near, combineLandCovers(localRegional, cachedCover))
  const coversFootprint = Boolean(hit && cachedCover && bboxCoveredBy(fp, hit.value.bbox))
  if (initial && (!publishedCached || near || localRegional)) opts.onUpdate?.(initial)
  if (hit?.fresh && coversFootprint) {
    const complete = hit.complete && !nearFailed
    const nextCheckAt = nearFailed ? null : hit.savedAt + (hit.complete ? COVER_TTL_MS : COVER_PARTIAL_TTL_MS)
    return { cover: initial, complete, nextCheckAt }
  }

  const retryOnly = Boolean(hit && coversFootprint && !hit.complete && hit.value.missingTiles?.length && clock() - hit.savedAt <= COVER_TTL_MS)
  const fresh = await fetchCoarseWorldCoverCog(
    place, signal, { fetchImpl, openTiff: opts.openTiff, now: clock, timeoutMs: opts.timeoutMs },
    { base: coversFootprint ? hit?.value : undefined, onlyTiles: retryOnly ? new Set(hit!.value.missingTiles!) : undefined },
  ).catch(() => null)
  if (signal?.aborted) return empty
  if (fresh) {
    const coarseComplete = fresh.complete === true && !fresh.missingTiles?.length
    const savedAt = hit && coversFootprint && (retryOnly || !coarseComplete) ? hit.savedAt : clock()
    if (opts.placeId) await writeCachedCover(opts.placeId, fresh, opts.store, savedAt).catch(() => undefined)
    if (signal?.aborted) return empty
    const next = combineLandCovers(near, combineLandCovers(localRegional, coarseCoverFromJson(fresh, 'remote-1km')))
    opts.onUpdate?.(next)
    const complete = coarseComplete && !nearFailed
    const until = savedAt + (coarseComplete ? COVER_TTL_MS : COVER_PARTIAL_TTL_MS)
    return { cover: next, complete, nextCheckAt: nearFailed || until <= clock() ? null : until }
  }
  if (!publishedCached && !initial) opts.onUpdate?.(null)
  return { cover: initial, complete: false, nextCheckAt: null }
}

export const loadFootprintLandCover = async (
  place: Coordinate, signal?: AbortSignal, nearRadiusKm = 6, fetchImpl: typeof fetch = fetch, opts: FootprintCoverOpts = {},
): Promise<LandCover | null> => (await loadFootprintLandCoverResult(place, signal, nearRadiusKm, fetchImpl, opts)).cover

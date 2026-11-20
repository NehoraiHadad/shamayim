import type { Coordinate } from '../landmarks/project'
import { createOpenTiff, isCogNotFound, type OpenTiffFn, type TiffImageLike } from './cogReader'
import { decodeLand, encodeLand } from './grid'
import {
  aggregateWorldCoverTile, CELLS_PER_DEG, clearWorldCoverSlice, footprintBbox, sameBbox,
  WORLDCOVER_FOOTPRINT_KM, WORLDCOVER_STEP_DEG, worldCoverTileName, type Bbox, type CoarseCoverJson,
} from './worldCoverGrid'
import { fetchWorldCoverSasToken, raceAbort } from './worldCoverSas'

/**
 * Runtime coarse ESA WorldCover 10 m 2021 v200 (CC BY 4.0) COG reader for places outside the
 * static regional Israel overview (`public/data/land/il/coarse.json`).
 *
 * CORS check (2026-11-20, `Origin: https://shamayim.nehoraihadad.com`):
 * - `esa-worldcover.s3.eu-central-1.amazonaws.com` fails CORS (OPTIONS 403; GET omits ACAO).
 * - Microsoft Planetary Computer mirrors official ESA v200 COGs on Azure Blob with full CORS
 *   (anonymous SAS `ACAO: *`, Blob OPTIONS 200 `range`, GET 206 `ACAO: *`).
 * Reads the coarsest overview `<= 0.01°` (IFD 6 = 562×562 ≈ 600 m/px), area-weights pixels into
 * 0.01° cells, distinguishes HTTP 404 absence and decoded nodata from transient failures, preserves
 * usable stale slices from `base`, and enforces an independent per-fetch timeout.
 */
export const WORLDCOVER_SAS_URL = 'https://planetarycomputer.microsoft.com/api/sas/v1/token/esa-worldcover'
export const WORLDCOVER_BLOB_ROOT = 'https://ai4edataeuwest.blob.core.windows.net/esa-worldcover/v200/2021/map'
export const COVER_FETCH_TIMEOUT_MS = 15_000
export interface WorldCoverCogDeps { fetchImpl?: typeof fetch; openTiff?: OpenTiffFn; now?: () => number; timeoutMs?: number }
export interface WorldCoverFetchOpts { reachKm?: number; base?: CoarseCoverJson; onlyTiles?: ReadonlySet<string> }

async function selectCoarseOverview(tiff: { getImageCount(): Promise<number>; getImage(i: number): Promise<TiffImageLike> }) {
  const count = await tiff.getImageCount()
  let best = await tiff.getImage(0), bestDeg = 3 / best.getWidth()
  for (let i = 1; i < count; i++) {
    const cand = await tiff.getImage(i), deg = 3 / cand.getWidth()
    if (deg <= WORLDCOVER_STEP_DEG && deg > bestDeg) { best = cand; bestDeg = deg }
  }
  return best
}

/** Fetches coarse 0.01° ESA WorldCover v200 over `±reachKm` around `place` from CORS-enabled COGs. */
export async function fetchCoarseWorldCoverCog(
  place: Coordinate, signal?: AbortSignal, deps: WorldCoverCogDeps = {}, opts: WorldCoverFetchOpts = {},
): Promise<CoarseCoverJson | null> {
  if (signal?.aborted) return null
  const fetchImpl = deps.fetchImpl ?? fetch, openTiff = deps.openTiff ?? createOpenTiff(fetchImpl)
  const clock = deps.now ?? Date.now, timeoutMs = deps.timeoutMs ?? COVER_FETCH_TIMEOUT_MS
  const bbox = footprintBbox(place, opts.reachKm ?? WORLDCOVER_FOOTPRINT_KM), [south, west, north, east] = bbox
  if (north <= south || east <= west) return null

  const rows = Math.round((north - south) * CELLS_PER_DEG), cols = Math.round((east - west) * CELLS_PER_DEG)
  const base = opts.base
  const usableBase = Boolean(
    base && base.stepDeg === WORLDCOVER_STEP_DEG && base.rows === rows && base.cols === cols && sameBbox(base.bbox, bbox),
  )
  const grid = usableBase ? decodeLand(base!.r, rows * cols) : new Uint8Array(rows * cols)

  const tiles: Array<{ tLat: number; tLon: number; code: string }> = []
  for (let tLat = Math.floor(south / 3) * 3; Math.round(north * CELLS_PER_DEG) > tLat * CELLS_PER_DEG; tLat += 3) {
    for (let tLon = Math.floor(west / 3) * 3; Math.round(east * CELLS_PER_DEG) > tLon * CELLS_PER_DEG; tLon += 3) {
      const wLon = (((tLon + 180) % 360) + 360) % 360 - 180
      tiles.push({ tLat, tLon, code: worldCoverTileName(tLat, wLon) })
    }
  }
  const toRead = usableBase && opts.onlyTiles ? tiles.filter((t) => opts.onlyTiles!.has(t.code)) : tiles
  if (toRead.length === 0) return null

  const ctrl = new AbortController()
  const onOuterAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onOuterAbort, { once: true })
  const timer = timeoutMs > 0 && Number.isFinite(timeoutMs) ? setTimeout(() => ctrl.abort(), timeoutMs) : undefined
  try {
    const token = await fetchWorldCoverSasToken(WORLDCOVER_SAS_URL, fetchImpl, clock, timeoutMs, COVER_FETCH_TIMEOUT_MS, ctrl.signal)
    if (!token || ctrl.signal.aborted) return null
    const failed = new Set<string>()
    let resolvedAny = false
    await Promise.all(toRead.map(async ({ tLat, tLon, code }) => {
      const url = `${WORLDCOVER_BLOB_ROOT}/ESA_WorldCover_10m_2021_v200_${code}_Map.tif?${token}`
      const slice: Bbox = [Math.max(south, tLat), Math.max(west, tLon), Math.min(north, tLat + 3), Math.min(east, tLon + 3)]
      try {
        const img = await raceAbort(selectCoarseOverview(await raceAbort(openTiff(url, ctrl.signal), ctrl.signal)), ctrl.signal)
        const pxX = img.getWidth() / 3, pxY = img.getHeight() / 3
        const x0 = Math.max(0, Math.floor((slice[1] - tLon) * pxX)), x1 = Math.min(img.getWidth(), Math.ceil((slice[3] - tLon) * pxX))
        const y0 = Math.max(0, Math.floor((tLat + 3 - slice[2]) * pxY)), y1 = Math.min(img.getHeight(), Math.ceil((tLat + 3 - slice[0]) * pxY))
        if (x1 <= x0 || y1 <= y0) { resolvedAny = true; return }
        const winW = x1 - x0, winH = y1 - y0
        const raw = await raceAbort(
          img.readRasters({ window: [x0, y0, x1, y1], width: winW, height: winH, interleave: true, signal: ctrl.signal }),
          ctrl.signal,
        )
        if (ctrl.signal.aborted) { failed.add(code); return }
        aggregateWorldCoverTile(raw, winW, winH, x0, y0, pxX, pxY, tLat, tLon, bbox, slice, grid, cols)
        resolvedAny = true
      } catch (err) {
        if (signal?.aborted) throw err
        if (isCogNotFound(err)) { clearWorldCoverSlice(bbox, slice, grid, cols); resolvedAny = true }
        else failed.add(code)
      }
    }))
    if (signal?.aborted || !resolvedAny) return null
    const unresolvedBase = usableBase && opts.onlyTiles && base?.missingTiles
      ? base.missingTiles.filter((c) => !opts.onlyTiles!.has(c)) : []
    const missingTiles = [...new Set([...unresolvedBase, ...failed])].sort()
    const complete = missingTiles.length === 0
    return {
      v: 1, bbox, stepDeg: WORLDCOVER_STEP_DEG, rows, cols, r: encodeLand(grid), complete,
      ...(missingTiles.length > 0 ? { missingTiles } : {}),
    }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }
}

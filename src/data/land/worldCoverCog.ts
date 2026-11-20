import type { Coordinate } from '../landmarks/project'
import { defaultOpenTiff, type OpenTiffFn, type TiffImageLike } from './cogReader'
import { coverOfWorldCover, encodeLand } from './grid'
import type { CoarseCoverJson } from './landData'

/**
 * Runtime coarse ESA WorldCover 10 m 2021 v200 (CC BY 4.0) COG reader for places outside the
 * static regional Israel overview (`public/data/land/il/coarse.json`).
 *
 * CORS check (2026-11-20, `Origin: https://shamayim.nehoraihadad.com`):
 * - `esa-worldcover.s3.eu-central-1.amazonaws.com` fails CORS (OPTIONS 403 `CORS is not enabled`;
 *   GET omits `Access-Control-Allow-Origin`).
 * - Microsoft Planetary Computer mirrors the exact official ESA v200 COGs on Azure Blob with full
 *   CORS (anonymous SAS `ACAO: *`, Blob OPTIONS 200 `range`, GET 206 `ACAO: *`).
 * Reads the coarsest overview `<= 0.01°` (IFD 6 = 562×562 ≈ 600 m/px), preserving water (`80->8`)
 * and explicit nodata (`0`). Returns `null` on CORS/network failure so callers fall back to climatology.
 */
export const WORLDCOVER_SAS_URL = 'https://planetarycomputer.microsoft.com/api/sas/v1/token/esa-worldcover'
export const WORLDCOVER_BLOB_ROOT = 'https://ai4edataeuwest.blob.core.windows.net/esa-worldcover/v200/2021/map'
export const WORLDCOVER_FOOTPRINT_KM = 60, WORLDCOVER_STEP_DEG = 0.01
const CELLS_PER_DEG = Math.round(1 / WORLDCOVER_STEP_DEG), SAS_REFRESH_MARGIN_MS = 5 * 60_000
export type Bbox = [number, number, number, number] // [south, west, north, east]
export interface WorldCoverCogDeps { fetchImpl?: typeof fetch; openTiff?: OpenTiffFn; now?: () => number }
let cachedSas: { token: string; expiresAt: number } | null = null, sasInFlight: Promise<string | null> | null = null

export function resetWorldCoverSasCache(): void { cachedSas = null; sasInFlight = null }

/** ESA WorldCover 3°×3° tile code from its south-west corner (e.g. `N48E000`, `S36E018`, `N36W123`). */
export function worldCoverTileName(tLat: number, tLon: number): string {
  const ns = tLat >= 0 ? 'N' : 'S', ew = tLon >= 0 ? 'E' : 'W'
  return `${ns}${String(Math.abs(tLat)).padStart(2, '0')}${ew}${String(Math.abs(tLon)).padStart(3, '0')}`
}

/** Snapped `[south, west, north, east]` bbox covering `±reachKm` around `place` (clamped to `[-60, 84]`). */
export function footprintBbox(place: Coordinate, reachKm = WORLDCOVER_FOOTPRINT_KM): Bbox {
  const cosLat = Math.max(0.1, Math.cos((place.lat * Math.PI) / 180))
  const dLat = reachKm / 111.32, dLon = reachKm / (111.32 * cosLat)
  const dn = (v: number) => Math.floor(v * CELLS_PER_DEG) / CELLS_PER_DEG
  const up = (v: number) => Math.ceil(v * CELLS_PER_DEG) / CELLS_PER_DEG
  return [Math.max(-60, dn(place.lat - dLat)), dn(place.lon - dLon), Math.min(84, up(place.lat + dLat)), up(place.lon + dLon)]
}

export const bboxCoveredBy = (inner: Bbox, outer: Bbox): boolean =>
  inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]

export const bboxIntersects = (a: Bbox, b: Bbox): boolean =>
  a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]

async function fetchSasToken(fetchImpl: typeof fetch, clock: () => number): Promise<string | null> {
  if (fetchImpl === fetch && cachedSas && clock() + SAS_REFRESH_MARGIN_MS < cachedSas.expiresAt) return cachedSas.token
  const run = async (): Promise<string | null> => {
    try {
      const res = await fetchImpl(WORLDCOVER_SAS_URL)
      if (!res.ok) return null
      const body = (await res.json()) as { token?: string; 'msft:expiry'?: string }
      if (!body.token) return null
      const exp = Date.parse(body['msft:expiry'] ?? '')
      if (fetchImpl === fetch) cachedSas = { token: body.token, expiresAt: Number.isFinite(exp) ? exp : clock() + 30 * 60_000 }
      return body.token
    } catch { return null }
  }
  if (fetchImpl !== fetch) return run()
  sasInFlight ??= run().finally(() => { sasInFlight = null })
  return sasInFlight
}

async function selectCoarseOverview(tiff: { getImageCount(): Promise<number>; getImage(i: number): Promise<TiffImageLike> }) {
  const count = await tiff.getImageCount()
  let best = await tiff.getImage(0), bestDeg = 3 / best.getWidth()
  for (let i = 1; i < count; i++) {
    const cand = await tiff.getImage(i), deg = 3 / cand.getWidth()
    if (deg <= WORLDCOVER_STEP_DEG && deg > bestDeg) { best = cand; bestDeg = deg }
  }
  return best
}

function aggregateTile(
  raw: ArrayLike<number>, winW: number, winH: number, x0: number, y0: number, pxX: number, pxY: number,
  tLat: number, tLon: number, bbox: Bbox, slice: Bbox, grid: Uint8Array, cols: number,
): number {
  const [, west, north] = bbox, [s, w, n, e] = slice
  const r0 = Math.round((north - n) * CELLS_PER_DEG), r1 = Math.round((north - s) * CELLS_PER_DEG)
  const c0 = Math.round((w - west) * CELLS_PER_DEG), c1 = Math.round((e - west) * CELLS_PER_DEG)
  const counts = new Uint16Array(16)
  let validCells = 0
  for (let row = r0; row < r1; row++) {
    const cN = north - row * WORLDCOVER_STEP_DEG, cS = cN - WORLDCOVER_STEP_DEG
    const py0 = Math.max(0, Math.floor((tLat + 3 - cN) * pxY) - y0), py1 = Math.min(winH, Math.ceil((tLat + 3 - cS) * pxY) - y0)
    for (let col = c0; col < c1; col++) {
      const cW = west + col * WORLDCOVER_STEP_DEG, cE = cW + WORLDCOVER_STEP_DEG
      const px0 = Math.max(0, Math.floor((cW - tLon) * pxX) - x0), px1 = Math.min(winW, Math.ceil((cE - tLon) * pxX) - x0)
      if (px1 <= px0 || py1 <= py0) continue
      counts.fill(0)
      let valid = 0, total = 0
      for (let py = py0; py < py1; py++) {
        for (let px = px0; px < px1; px++) {
          total++
          const cls = coverOfWorldCover(raw[py * winW + px])
          if (cls > 0) { counts[cls]++; valid++ }
        }
      }
      if (valid * 2 >= total) {
        let best = 0
        for (let k = 1; k < 16; k++) if (counts[k] > counts[best]) best = k
        if (best > 0) { grid[row * cols + col] = best; validCells++ }
      }
    }
  }
  return validCells
}

/** Fetches coarse 0.01° ESA WorldCover v200 over `±reachKm` around `place` from public CORS-enabled COGs. */
export async function fetchCoarseWorldCoverCog(
  place: Coordinate, signal?: AbortSignal, deps: WorldCoverCogDeps = {}, reachKm = WORLDCOVER_FOOTPRINT_KM,
): Promise<CoarseCoverJson | null> {
  if (signal?.aborted) return null
  const fetchImpl = deps.fetchImpl ?? fetch, openTiff = deps.openTiff ?? defaultOpenTiff, clock = deps.now ?? Date.now
  const bbox = footprintBbox(place, reachKm), [south, west, north, east] = bbox
  if (north <= south || east <= west) return null
  const token = await fetchSasToken(fetchImpl, clock)
  if (!token || signal?.aborted) return null

  const rows = Math.round((north - south) * CELLS_PER_DEG), cols = Math.round((east - west) * CELLS_PER_DEG)
  const grid = new Uint8Array(rows * cols)
  const tiles: Array<{ tLat: number; tLon: number }> = []
  for (let tLat = Math.floor(south / 3) * 3; tLat < north; tLat += 3) {
    for (let tLon = Math.floor(west / 3) * 3; tLon < east; tLon += 3) tiles.push({ tLat, tLon })
  }

  let validCells = 0
  await Promise.all(tiles.map(async ({ tLat, tLon }) => {
    const wLon = (((tLon + 180) % 360) + 360) % 360 - 180
    const url = `${WORLDCOVER_BLOB_ROOT}/ESA_WorldCover_10m_2021_v200_${worldCoverTileName(tLat, wLon)}_Map.tif?${token}`
    const slice: Bbox = [Math.max(south, tLat), Math.max(west, tLon), Math.min(north, tLat + 3), Math.min(east, tLon + 3)]
    try {
      const img = await selectCoarseOverview(await openTiff(url, signal))
      const pxX = img.getWidth() / 3, pxY = img.getHeight() / 3
      const x0 = Math.max(0, Math.floor((slice[1] - tLon) * pxX)), x1 = Math.min(img.getWidth(), Math.ceil((slice[3] - tLon) * pxX))
      const y0 = Math.max(0, Math.floor((tLat + 3 - slice[2]) * pxY)), y1 = Math.min(img.getHeight(), Math.ceil((tLat + 3 - slice[0]) * pxY))
      if (x1 <= x0 || y1 <= y0) return
      const winW = x1 - x0, winH = y1 - y0
      const raw = await img.readRasters({ window: [x0, y0, x1, y1], width: winW, height: winH, interleave: true, signal })
      validCells += aggregateTile(raw, winW, winH, x0, y0, pxX, pxY, tLat, tLon, bbox, slice, grid, cols)
    } catch (err) { if (signal?.aborted) throw err }
  }))
  return signal?.aborted || validCells === 0 ? null : { v: 1, bbox, stepDeg: WORLDCOVER_STEP_DEG, rows, cols, r: encodeLand(grid) }
}

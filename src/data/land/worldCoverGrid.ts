import type { Coordinate } from '../landmarks/project'
import { EARTH_R_KM, FAR_KM } from '../terrain/panorama'
import { coverOfWorldCover, decodeLand } from './grid'
import type { LandCover } from './landData'

/**
 * Spherical footprint geometry, coarse-grid lookup and area-weighted aggregation for `0.01°` ESA
 * WorldCover 2021 v200 overviews. Matches the panorama sphere (`EARTH_R_KM = 6371`, `FAR_KM = 60`).
 */
export const WORLDCOVER_FOOTPRINT_KM = FAR_KM
export const WORLDCOVER_STEP_DEG = 0.01
export const CELLS_PER_DEG = Math.round(1 / WORLDCOVER_STEP_DEG)
export type Bbox = [number, number, number, number] // [south, west, north, east]

export interface CoarseCoverJson {
  v: number; bbox: Bbox; stepDeg: number; rows: number; cols: number; r: string
  /** Tile codes that failed transiently on last fetch and still need retry; absent/empty = complete. */
  missingTiles?: string[]
}

/** Builds a `LandCover` lookup over a coarse RLE-encoded WorldCover overview grid. */
export function coarseCoverFromJson(raw: CoarseCoverJson): LandCover {
  const [south, west, north, east] = raw.bbox
  const grid = decodeLand(raw.r, raw.rows * raw.cols)
  const { stepDeg, rows, cols } = raw
  return {
    coverAt(lat, lon) {
      if (lat < south || lat >= north || lon < west || lon >= east) return 0
      const row = Math.min(rows - 1, Math.max(0, Math.floor((north - lat) / stepDeg)))
      const col = Math.min(cols - 1, Math.max(0, Math.floor((lon - west) / stepDeg)))
      return grid[row * cols + col]
    },
  }
}

/** Combines a high-resolution near `LandCover` with a coarser far-footprint `LandCover` (near wins when > 0). */
export function combineLandCovers(near: LandCover | null, far: LandCover | null): LandCover | null {
  if (!near) return far
  if (!far) return near
  return { coverAt(lat, lon) { const n = near.coverAt(lat, lon); return n > 0 ? n : far.coverAt(lat, lon) } }
}

/** ESA WorldCover 3°×3° tile code from its south-west corner (e.g. `N48E000`, `S36E018`, `N36W123`). */
export function worldCoverTileName(tLat: number, tLon: number): string {
  const ns = tLat >= 0 ? 'N' : 'S', ew = tLon >= 0 ? 'E' : 'W'
  return `${ns}${String(Math.abs(tLat)).padStart(2, '0')}${ew}${String(Math.abs(tLon)).padStart(3, '0')}`
}

/**
 * Outward-snapped `[south, west, north, east]` bbox containing every spherical
 * `destination(place.lat, place.lon, d, az)` for `0 <= d <= reachKm`, `0 <= az < 360°`.
 * Upper bounds snap strictly above so half-open `[south, north) × [west, east)` covers boundary tips.
 * Clamped to ESA WorldCover latitude bounds `[-60, 84]`.
 */
export function footprintBbox(place: Coordinate, reachKm = WORLDCOVER_FOOTPRINT_KM): Bbox {
  const rad = Math.PI / 180
  const delta = reachKm / EARTH_R_KM
  const dLat = delta / rad
  // Exact spherical circle tangent meridian: sin(Δλ_max) = sin(δ) / cos(φ₁)
  const sinRatio = Math.sin(delta) / Math.max(1e-9, Math.cos(place.lat * rad))
  const dLon = sinRatio >= 1 ? 180 : Math.asin(sinRatio) / rad
  const dn = (v: number) => Math.floor(v * CELLS_PER_DEG) / CELLS_PER_DEG
  const upOpen = (v: number) => (Math.floor(v * CELLS_PER_DEG) + 1) / CELLS_PER_DEG
  return [
    Math.max(-60, dn(place.lat - dLat)),
    dn(place.lon - dLon),
    Math.min(84, upOpen(place.lat + dLat)),
    upOpen(place.lon + dLon),
  ]
}

export const bboxCoveredBy = (inner: Bbox, outer: Bbox): boolean =>
  inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]

export const bboxIntersects = (a: Bbox, b: Bbox): boolean =>
  a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]

export const sameBbox = (a: Bbox, b: Bbox): boolean =>
  a.every((v, i) => Math.abs(v - b[i]) < 1e-9)

/** Clears a tile slice in `grid` to `0` (before writing decoded cells or on known-absent 404 tiles). */
export function clearWorldCoverSlice(bbox: Bbox, slice: Bbox, grid: Uint8Array, cols: number): void {
  const [, west, north] = bbox, [s, w, n, e] = slice
  const r0 = Math.round((north - n) * CELLS_PER_DEG), r1 = Math.round((north - s) * CELLS_PER_DEG)
  const c0 = Math.round((w - west) * CELLS_PER_DEG), c1 = Math.round((e - west) * CELLS_PER_DEG)
  for (let row = r0; row < r1; row++) grid.fill(0, row * cols + c0, row * cols + c1)
}

/**
 * Area-weighted aggregation of a WorldCover overview window into `0.01°` cells.
 * Each source pixel contributes its exact 2D overlap area with the cell; a cell emits the valid
 * class with the largest overlap area iff valid overlap area is `>= 50 %` of cell area, else `0`.
 */
export function aggregateWorldCoverTile(
  raw: ArrayLike<number>, winW: number, winH: number, x0: number, y0: number, pxX: number, pxY: number,
  tLat: number, tLon: number, bbox: Bbox, slice: Bbox, grid: Uint8Array, cols: number,
): number {
  clearWorldCoverSlice(bbox, slice, grid, cols)
  const [, west, north] = bbox, [s, w, n, e] = slice
  const r0 = Math.round((north - n) * CELLS_PER_DEG), r1 = Math.round((north - s) * CELLS_PER_DEG)
  const c0 = Math.round((w - west) * CELLS_PER_DEG), c1 = Math.round((e - west) * CELLS_PER_DEG)
  const weights = new Float64Array(16)
  let validCells = 0
  for (let row = r0; row < r1; row++) {
    const cN = north - row * WORLDCOVER_STEP_DEG, cS = cN - WORLDCOVER_STEP_DEG
    const cy0 = (tLat + 3 - cN) * pxY, cy1 = (tLat + 3 - cS) * pxY
    const py0 = Math.max(0, Math.floor(cy0) - y0), py1 = Math.min(winH, Math.ceil(cy1) - y0)
    for (let col = c0; col < c1; col++) {
      const cW = west + col * WORLDCOVER_STEP_DEG, cE = cW + WORLDCOVER_STEP_DEG
      const cx0 = (cW - tLon) * pxX, cx1 = (cE - tLon) * pxX
      const px0 = Math.max(0, Math.floor(cx0) - x0), px1 = Math.min(winW, Math.ceil(cx1) - x0)
      if (px1 <= px0 || py1 <= py0) continue
      weights.fill(0)
      let validArea = 0, totalArea = 0
      for (let py = py0; py < py1; py++) {
        const gy = y0 + py
        const oy = Math.min(gy + 1, cy1) - Math.max(gy, cy0)
        if (oy <= 0) continue
        const rowOff = py * winW
        for (let px = px0; px < px1; px++) {
          const gx = x0 + px
          const ox = Math.min(gx + 1, cx1) - Math.max(gx, cx0)
          if (ox <= 0) continue
          const area = ox * oy
          totalArea += area
          const cls = coverOfWorldCover(raw[rowOff + px])
          if (cls > 0) { weights[cls] += area; validArea += area }
        }
      }
      if (totalArea > 0 && validArea * 2 >= totalArea - 1e-12) {
        let best = 0
        for (let k = 1; k < 16; k++) if (weights[k] > weights[best]) best = k
        if (best > 0) { grid[row * cols + col] = best; validCells++ }
      }
    }
  }
  return validCells
}

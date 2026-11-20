import type { LandCover } from './landData'
import { nearCellCenter } from './nearGrid'
import type { NearLandGrid } from './types'

/** Minimum overview support fraction in a 100 m S2 cell to trust that channel over coarser fallbacks. */
export const MIN_CELL_VALID = 0.2
const MIN_COVER_SAMPLES = 8

export interface CoverMean {
  rgb: [number, number, number]
  ndvi: number | null
  count: number
}

export interface CoverMeansTable {
  date: string
  source: `s2-mean:${string}`
  byCover: Record<number, CoverMean>
}

const MEANS_CACHE = new WeakMap<NearLandGrid, WeakMap<LandCover, CoverMeansTable>>()

/**
 * Computes per-WorldCover-class mean RGB and NDVI across a near Sentinel-2 window.
 * Excludes unknown/out-of-coverage class `0` and never exports near-window snow/NDSI to other elevations.
 */
export function computeCoverMeans(near: NearLandGrid, cover: LandCover): CoverMeansTable {
  let inner = MEANS_CACHE.get(near)
  const hit = inner?.get(cover)
  if (hit) return hit

  const acc: Record<number, { r: number; g: number; b: number; rgbN: number; ndvi: number; ndviN: number }> = {}
  const stride = Math.max(1, Math.floor(near.size / 50))
  for (let row = 0; row < near.size; row += stride) {
    for (let col = 0; col < near.size; col += stride) {
      const idx = row * near.size + col
      const okRgb = near.rgbValid[idx] >= MIN_CELL_VALID
      const okNdvi = near.ndviValid[idx] >= MIN_CELL_VALID && Number.isFinite(near.ndvi[idx])
      if (!okRgb && !okNdvi) continue
      const o = idx * 3
      const r = near.rgb[o], g = near.rgb[o + 1], b = near.rgb[o + 2]
      const hasRgb = okRgb && (r || g || b)
      if (!hasRgb && !okNdvi) continue
      const { lat, lon } = nearCellCenter(near, row, col)
      const cls = cover.coverAt(lat, lon)
      if (cls <= 0) continue
      const slot = (acc[cls] ??= { r: 0, g: 0, b: 0, rgbN: 0, ndvi: 0, ndviN: 0 })
      if (hasRgb) { slot.r += r; slot.g += g; slot.b += b; slot.rgbN++ }
      if (okNdvi) { slot.ndvi += near.ndvi[idx]; slot.ndviN++ }
    }
  }

  const byCover: Record<number, CoverMean> = {}
  for (const [k, s] of Object.entries(acc)) {
    if (s.rgbN < MIN_COVER_SAMPLES) continue
    byCover[Number(k)] = {
      rgb: [Math.round(s.r / s.rgbN), Math.round(s.g / s.rgbN), Math.round(s.b / s.rgbN)],
      ndvi: s.ndviN >= MIN_COVER_SAMPLES ? s.ndvi / s.ndviN : null,
      count: s.rgbN,
    }
  }

  const table: CoverMeansTable = { date: near.date, source: `s2-mean:${near.date}`, byCover }
  if (!inner) { inner = new WeakMap(); MEANS_CACHE.set(near, inner) }
  inner.set(cover, table)
  return table
}

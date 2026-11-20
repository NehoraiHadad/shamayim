import type { LandCover } from './landData'
import { nearCellCenter } from './nearGrid'
import type { NearLandGrid } from './types'

/** Minimum support fraction in a 100 m S2 cell to trust that channel over coarser fallbacks. */
export const MIN_CELL_VALID = 0.2
const MIN_COVER_SAMPLES = 8

export interface CoverMean {
  rgb: [number, number, number] | null
  rgbCount: number
  rgbDate: string | null
  ndvi: number | null
  ndviCount: number
  ndviDate: string | null
}

export interface CoverMeansTable {
  date: string
  source: `s2-mean:${string}`
  byCover: Record<number, CoverMean>
}

interface CoverAcc {
  r: number; g: number; b: number; rgbN: number; rgbDates: Map<string, number>
  ndvi: number; ndviN: number; ndviDates: Map<string, number>
}

const MEANS_CACHE = new WeakMap<NearLandGrid, WeakMap<LandCover, CoverMeansTable>>()

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function modalDate(map: Map<string, number>): string | null {
  let best: string | null = null, bestN = 0
  for (const [d, n] of map) if (n > bestN) { best = d; bestN = n }
  return best
}

const dateAt = (near: NearLandGrid, idxArr: Uint8Array | undefined, i: number): string => {
  const a = idxArr ? idxArr[i] : 255
  return a < near.acquisitions.length ? near.acquisitions[a].date : near.date
}

/**
 * Computes per-WorldCover-class mean RGB and NDVI independently across a near Sentinel-2 window.
 * Excludes unknown/out-of-coverage class `0`, lets NDVI-only or RGB-only classes populate their
 * available channel independently, and never exports near-window snow/NDSI to other elevations.
 */
export function computeCoverMeans(near: NearLandGrid, cover: LandCover): CoverMeansTable {
  let inner = MEANS_CACHE.get(near)
  const hit = inner?.get(cover)
  if (hit) return hit

  const acc: Record<number, CoverAcc> = {}
  const stride = Math.max(1, Math.floor(near.size / 50))
  for (let row = 0; row < near.size; row += stride) {
    for (let col = 0; col < near.size; col += stride) {
      const idx = row * near.size + col
      const o = idx * 3
      const r = near.rgb[o], g = near.rgb[o + 1], b = near.rgb[o + 2]
      const hasRgb = near.rgbValid[idx] >= MIN_CELL_VALID && Boolean(r || g || b)
      const okNdvi = near.ndviValid[idx] >= MIN_CELL_VALID && Number.isFinite(near.ndvi[idx])
      if (!hasRgb && !okNdvi) continue
      const { lat, lon } = nearCellCenter(near, row, col)
      const cls = cover.coverAt(lat, lon)
      if (cls <= 0) continue
      const slot = (acc[cls] ??= {
        r: 0, g: 0, b: 0, rgbN: 0, rgbDates: new Map(),
        ndvi: 0, ndviN: 0, ndviDates: new Map(),
      })
      if (hasRgb) { slot.r += r; slot.g += g; slot.b += b; slot.rgbN++; bump(slot.rgbDates, dateAt(near, near.acqIndex, idx)) }
      if (okNdvi) { slot.ndvi += near.ndvi[idx]; slot.ndviN++; bump(slot.ndviDates, dateAt(near, near.ndviAcqIndex, idx)) }
    }
  }

  const byCover: Record<number, CoverMean> = {}
  for (const [k, s] of Object.entries(acc)) {
    const rgbOk = s.rgbN >= MIN_COVER_SAMPLES
    const ndviOk = s.ndviN >= MIN_COVER_SAMPLES
    if (!rgbOk && !ndviOk) continue
    byCover[Number(k)] = {
      rgb: rgbOk ? [Math.round(s.r / s.rgbN), Math.round(s.g / s.rgbN), Math.round(s.b / s.rgbN)] : null,
      rgbCount: s.rgbN,
      rgbDate: rgbOk ? modalDate(s.rgbDates) : null,
      ndvi: ndviOk ? s.ndvi / s.ndviN : null,
      ndviCount: s.ndviN,
      ndviDate: ndviOk ? modalDate(s.ndviDates) : null,
    }
  }

  const table: CoverMeansTable = { date: near.date, source: `s2-mean:${near.date}`, byCover }
  if (!inner) { inner = new WeakMap(); MEANS_CACHE.set(near, inner) }
  inner.set(cover, table)
  return table
}

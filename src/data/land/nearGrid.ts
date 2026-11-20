import type { GridBuffers } from './s2Aggregate'
import type { AcquisitionGeometry, NearCell, NearLandGrid } from './types'
import { fromUtm, toUtm } from './utm'

/** UTM-aligned sampling, inverse cell-center projection and buffer helpers for `NearLandGrid`. */

/** Computes the exact WGS84 center `(lat, lon)` of cell `(row, col)` in a `NearLandGrid`. */
export function nearCellCenter(grid: NearLandGrid, row: number, col: number): { lat: number; lon: number } {
  const e = grid.originE + (col + 0.5) * grid.stepM
  const n = grid.originN - (row + 0.5) * grid.stepM
  return fromUtm(e, n, grid.utmZone, grid.utmSouth)
}

/** Looks up the near-field Sentinel-2 cell at `(lat, lon)` using the grid's exact UTM transform. */
export function nearAt(grid: NearLandGrid, lat: number, lon: number): NearCell | null {
  const { e, n } = toUtm(lat, lon, grid.utmZone, grid.utmSouth)
  const col = Math.floor((e - grid.originE) / grid.stepM)
  const row = Math.floor((grid.originN - n) / grid.stepM)
  if (row < 0 || col < 0 || row >= grid.size || col >= grid.size) return null
  const idx = row * grid.size + col
  const valid = grid.valid[idx]
  const rgbValid = grid.rgbValid[idx]
  const ndviValid = grid.ndviValid[idx]
  const ndsiValid = grid.ndsiValid[idx]
  if (!(valid > 0 || rgbValid > 0 || ndviValid > 0 || ndsiValid > 0)) return null
  const o = idx * 3
  const hasRgb = rgbValid > 0 && (grid.rgb[o] || grid.rgb[o + 1] || grid.rgb[o + 2])
  const acq = grid.acqIndex[idx] < grid.acquisitions.length ? grid.acquisitions[grid.acqIndex[idx]] : undefined
  return {
    rgb: hasRgb ? [grid.rgb[o], grid.rgb[o + 1], grid.rgb[o + 2]] : null,
    ndvi: ndviValid > 0 && Number.isFinite(grid.ndvi[idx]) ? grid.ndvi[idx] : null,
    ndsi: ndsiValid > 0 && Number.isFinite(grid.ndsi[idx]) ? grid.ndsi[idx] : null,
    snow: valid > 0 && Number.isFinite(grid.snow[idx]) ? grid.snow[idx] : null,
    valid, rgbValid, ndviValid, ndsiValid,
    sunElevation: acq?.sunElevation ?? grid.sunElevation,
    sunAzimuth: acq?.sunAzimuth ?? grid.sunAzimuth,
    date: grid.date,
    source: grid.source,
  }
}

export function makeNearBuffers(size: number): GridBuffers {
  const n = size * size
  return {
    size, rgb: new Uint8Array(n * 3),
    ndvi: new Float32Array(n).fill(Number.NaN),
    ndsi: new Float32Array(n).fill(Number.NaN),
    snow: new Float32Array(n).fill(Number.NaN),
    valid: new Float32Array(n), rgbValid: new Float32Array(n),
    ndviValid: new Float32Array(n), ndsiValid: new Float32Array(n),
    acqIndex: new Uint8Array(n).fill(255),
  }
}

export function dominantGeometry(out: GridBuffers, acqs: AcquisitionGeometry[]): AcquisitionGeometry {
  const counts = new Uint32Array(acqs.length)
  for (let i = 0; i < out.acqIndex.length; i++) {
    const a = out.acqIndex[i]
    if (a < acqs.length) counts[a]++
  }
  let best = 0
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i
  return acqs[best] ?? {}
}

import type { GridBuffers } from './s2Aggregate'
import type { AcquisitionGeometry, NearCell, NearLandGrid } from './types'
import { fromUtm, toUtm } from './utm'

/** UTM-aligned sampling, inverse cell-center projection, multi-date fill and buffer helpers for `NearLandGrid`. */

/** Computes the exact WGS84 center `(lat, lon)` of cell `(row, col)` in a `NearLandGrid`. */
export function nearCellCenter(grid: NearLandGrid, row: number, col: number): { lat: number; lon: number } {
  const e = grid.originE + (col + 0.5) * grid.stepM
  const n = grid.originN - (row + 0.5) * grid.stepM
  return fromUtm(e, n, grid.utmZone, grid.utmSouth)
}

const acqAt = (grid: NearLandGrid, idxArr: Uint8Array | undefined, cellIdx: number): AcquisitionGeometry | undefined => {
  const i = idxArr ? idxArr[cellIdx] : 255
  return i < grid.acquisitions.length ? grid.acquisitions[i] : undefined
}

/** Looks up the near-field Sentinel-2 cell at `(lat, lon)` using the grid's exact UTM transform. */
export function nearAt(grid: NearLandGrid, lat: number, lon: number): NearCell | null {
  const { e, n } = toUtm(lat, lon, grid.utmZone, grid.utmSouth)
  const col = Math.floor((e - grid.originE) / grid.stepM)
  const row = Math.floor((grid.originN - n) / grid.stepM)
  if (row < 0 || col < 0 || row >= grid.size || col >= grid.size) return null
  const idx = row * grid.size + col
  const valid = grid.valid[idx], rgbValid = grid.rgbValid[idx], ndviValid = grid.ndviValid[idx], ndsiValid = grid.ndsiValid[idx]
  if (!(valid > 0 || rgbValid > 0 || ndviValid > 0 || ndsiValid > 0)) return null

  const o = idx * 3
  const hasRgb = rgbValid > 0 && Boolean(grid.rgb[o] || grid.rgb[o + 1] || grid.rgb[o + 2])
  const hasNdvi = ndviValid > 0 && Number.isFinite(grid.ndvi[idx])
  const hasNdsi = ndsiValid > 0 && Number.isFinite(grid.ndsi[idx])
  const hasSnow = valid > 0 && Number.isFinite(grid.snow[idx])

  const rgbAcq = hasRgb ? acqAt(grid, grid.acqIndex, idx) : undefined
  const ndviAcq = hasNdvi ? acqAt(grid, grid.ndviAcqIndex, idx) : undefined
  const ndsiAcq = hasNdsi ? acqAt(grid, grid.ndsiAcqIndex, idx) : undefined
  const snowAcq = hasSnow ? acqAt(grid, grid.snowAcqIndex, idx) : undefined

  const rgbDate = hasRgb ? (rgbAcq?.date ?? grid.date) : null
  const ndviDate = hasNdvi ? (ndviAcq?.date ?? grid.date) : null
  const ndsiDate = hasNdsi ? (ndsiAcq?.date ?? grid.date) : null
  const snowDate = hasSnow ? (snowAcq?.date ?? grid.date) : null
  const cellDate = rgbDate ?? ndviDate ?? snowDate ?? grid.date

  return {
    rgb: hasRgb ? [grid.rgb[o], grid.rgb[o + 1], grid.rgb[o + 2]] : null,
    ndvi: hasNdvi ? grid.ndvi[idx] : null,
    ndsi: hasNdsi ? grid.ndsi[idx] : null,
    snow: hasSnow ? grid.snow[idx] : null,
    valid, rgbValid, ndviValid, ndsiValid,
    // Preserve missing angles strictly on the actual RGB contributor (never borrow from dominant granule).
    sunElevation: rgbAcq?.sunElevation,
    sunAzimuth: rgbAcq?.sunAzimuth,
    date: cellDate,
    source: `s2:${cellDate}`,
    rgbDate, rgbSource: rgbDate ? `s2:${rgbDate}` : null,
    ndviDate, ndviSource: ndviDate ? `s2:${ndviDate}` : null,
    ndsiDate, ndsiSource: ndsiDate ? `s2:${ndsiDate}` : null,
    snowDate, snowSource: snowDate ? `s2:${snowDate}` : null,
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
    ndviAcqIndex: new Uint8Array(n).fill(255),
    ndsiAcqIndex: new Uint8Array(n).fill(255),
    snowAcqIndex: new Uint8Array(n).fill(255),
  }
}

/** Fills channels/cells in `dst` that are below `minUsable` using stronger observations from an older date. */
export function mergeOlderGrid(dst: GridBuffers, src: GridBuffers, minUsable: number): void {
  const n = dst.size * dst.size
  for (let i = 0; i < n; i++) {
    if (dst.valid[i] < minUsable && src.valid[i] > dst.valid[i]) {
      dst.valid[i] = src.valid[i]; dst.snow[i] = src.snow[i]; dst.snowAcqIndex[i] = src.snowAcqIndex[i]
    }
    if (dst.rgbValid[i] < minUsable && src.rgbValid[i] > dst.rgbValid[i]) {
      dst.rgbValid[i] = src.rgbValid[i]
      const o = i * 3
      dst.rgb[o] = src.rgb[o]; dst.rgb[o + 1] = src.rgb[o + 1]; dst.rgb[o + 2] = src.rgb[o + 2]
      dst.acqIndex[i] = src.acqIndex[i]
    }
    if (dst.ndviValid[i] < minUsable && src.ndviValid[i] > dst.ndviValid[i]) {
      dst.ndviValid[i] = src.ndviValid[i]; dst.ndvi[i] = src.ndvi[i]; dst.ndviAcqIndex[i] = src.ndviAcqIndex[i]
    }
    if (dst.ndsiValid[i] < minUsable && src.ndsiValid[i] > dst.ndsiValid[i]) {
      dst.ndsiValid[i] = src.ndsiValid[i]; dst.ndsi[i] = src.ndsi[i]; dst.ndsiAcqIndex[i] = src.ndsiAcqIndex[i]
    }
  }
}

/** Measures overall and central-footprint channel coverage ratios (`[0, 1]`). */
export function gridCoverage(buf: GridBuffers, minUsable: number) {
  const s = buf.size, n = s * s
  const cLo = Math.floor(s * 0.4), cHi = Math.ceil(s * 0.6)
  let any = 0, rgb = 0, ndvi = 0, cTotal = 0, cRgb = 0, cNdvi = 0
  for (let r = 0; r < s; r++) {
    const inC = r >= cLo && r < cHi
    for (let c = 0; c < s; c++) {
      const i = r * s + c
      const okR = buf.rgbValid[i] >= minUsable, okN = buf.ndviValid[i] >= minUsable
      if (okR) rgb++
      if (okN) ndvi++
      if (okR || okN) any++
      if (inC && c >= cLo && c < cHi) { cTotal++; if (okR) cRgb++; if (okN) cNdvi++ }
    }
  }
  return {
    any: any / n, rgb: rgb / n, ndvi: ndvi / n,
    centerRgb: cTotal ? cRgb / cTotal : 0, centerNdvi: cTotal ? cNdvi / cTotal : 0,
  }
}

export function dominantGeometry(out: GridBuffers, acqs: AcquisitionGeometry[]): AcquisitionGeometry | undefined {
  const counts = new Uint32Array(acqs.length)
  for (let i = 0; i < out.acqIndex.length; i++) {
    const a = out.acqIndex[i]
    if (a < acqs.length) counts[a]++
  }
  let best = -1
  for (let i = 0; i < counts.length; i++) if (counts[i] > 0 && (best < 0 || counts[i] > counts[best])) best = i
  return best >= 0 ? acqs[best] : undefined
}

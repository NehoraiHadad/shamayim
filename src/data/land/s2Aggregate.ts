import { computeNdsi, computeNdvi, isValidScl, type BandScaling } from './s2Math'
import { fromUtm, toUtm } from './utm'

/**
 * Area-weighted georeferenced aggregation of Sentinel-2 L2A overview patches onto a target UTM grid.
 * Weights each pixel by its exact geometric overlap area with each target 100 m cell so uniform clear
 * coverage at 40 m overview spacing reports phase-independent support of 1.0 in every interior cell.
 * Tracks SCL validity, RGB, NDVI and NDSI support independently and derives observed snow fraction
 * from SCL class 11 over valid non-water pixels (excluding SCL 6 open water).
 */

export interface PatchBands {
  width: number; height: number
  west: number; north: number; resX: number; resY: number
  zone: number; south: boolean
  acqId: number
  scl: Uint8Array
  visual?: Uint8Array
  red?: ArrayLike<number>; nir?: ArrayLike<number>
  redScale?: BandScaling; nirScale?: BandScaling
  green?: ArrayLike<number>; swir?: ArrayLike<number>
  greenScale?: BandScaling; swirScale?: BandScaling
}

export interface GridTransform {
  size: number; originE: number; originN: number; stepM: number; utmZone: number; utmSouth: boolean
}

export interface GridBuffers {
  size: number; rgb: Uint8Array; ndvi: Float32Array; ndsi: Float32Array; snow: Float32Array
  valid: Float32Array; rgbValid: Float32Array; ndviValid: Float32Array; ndsiValid: Float32Array
  acqIndex: Uint8Array; ndviAcqIndex: Uint8Array; ndsiAcqIndex: Uint8Array; snowAcqIndex: Uint8Array
}

/** Aggregates a georeferenced S2 patch into the target UTM grid using exact pixel-cell overlap area. */
export function aggregatePatch(patch: PatchBands, grid: GridTransform, out: GridBuffers): void {
  const n = grid.size * grid.size
  const validW = new Float64Array(n), landW = new Float64Array(n), snowW = new Float64Array(n)
  const rgbW = new Float64Array(n), rSum = new Float64Array(n), gSum = new Float64Array(n), bSum = new Float64Array(n)
  const ndviW = new Float64Array(n), ndviSum = new Float64Array(n)
  const ndsiW = new Float64Array(n), ndsiSum = new Float64Array(n)
  const sameCrs = patch.zone === grid.utmZone && patch.south === grid.utmSouth
  const hasNdvi = Boolean(patch.red && patch.nir && patch.redScale && patch.nirScale)
  const hasNdsi = Boolean(patch.green && patch.swir && patch.greenScale && patch.swirScale)
  const cellArea = grid.stepM * grid.stepM

  for (let py = 0; py < patch.height; py++) {
    const pn1 = patch.north - py * patch.resY, pn0 = pn1 - patch.resY
    for (let px = 0; px < patch.width; px++) {
      const p = py * patch.width + px
      const s = patch.scl[p]
      if (!isValidScl(s)) continue

      let e0 = patch.west + px * patch.resX, e1 = e0 + patch.resX, n0 = pn0, n1 = pn1
      if (!sameCrs) {
        const ll = fromUtm(e0 + 0.5 * patch.resX, n0 + 0.5 * patch.resY, patch.zone, patch.south)
        const m = toUtm(ll.lat, ll.lon, grid.utmZone, grid.utmSouth)
        e0 = m.e - 0.5 * patch.resX; e1 = m.e + 0.5 * patch.resX
        n0 = m.n - 0.5 * patch.resY; n1 = m.n + 0.5 * patch.resY
      }
      const c0 = Math.max(0, Math.floor((e0 - grid.originE) / grid.stepM))
      const c1 = Math.min(grid.size - 1, Math.floor((e1 - 1e-6 - grid.originE) / grid.stepM))
      const r0 = Math.max(0, Math.floor((grid.originN - n1) / grid.stepM))
      const r1 = Math.min(grid.size - 1, Math.floor((grid.originN - n0 - 1e-6) / grid.stepM))
      if (c1 < c0 || r1 < r0) continue

      let r = 0, g = 0, b = 0, hasRgb = false
      if (patch.visual) {
        const v = p * 3
        r = patch.visual[v]; g = patch.visual[v + 1]; b = patch.visual[v + 2]
        hasRgb = Boolean(r || g || b)
      }
      const ndviVal = hasNdvi ? computeNdvi(patch.red![p], patch.nir![p], patch.redScale!, patch.nirScale!) : null
      const ndsiVal = hasNdsi ? computeNdsi(patch.green![p], patch.swir![p], patch.greenScale!, patch.swirScale!) : null

      for (let row = r0; row <= r1; row++) {
        const cellN1 = grid.originN - row * grid.stepM, cellN0 = cellN1 - grid.stepM
        const ovN = Math.min(n1, cellN1) - Math.max(n0, cellN0)
        if (ovN <= 0) continue
        for (let col = c0; col <= c1; col++) {
          const cellE0 = grid.originE + col * grid.stepM, cellE1 = cellE0 + grid.stepM
          const ovE = Math.min(e1, cellE1) - Math.max(e0, cellE0)
          if (ovE <= 0) continue
          const w = (ovE * ovN) / cellArea
          const idx = row * grid.size + col
          validW[idx] += w
          if (s !== 6) { landW[idx] += w; if (s === 11) snowW[idx] += w }
          if (hasRgb) { rSum[idx] += r * w; gSum[idx] += g * w; bSum[idx] += b * w; rgbW[idx] += w }
          if (ndviVal !== null) { ndviSum[idx] += ndviVal * w; ndviW[idx] += w }
          if (ndsiVal !== null) { ndsiSum[idx] += ndsiVal * w; ndsiW[idx] += w }
        }
      }
    }
  }

  for (let idx = 0; idx < n; idx++) {
    const sclFrac = Math.min(1, validW[idx])
    if (sclFrac <= 0) continue
    if (sclFrac > out.valid[idx]) {
      out.valid[idx] = sclFrac
      out.snow[idx] = landW[idx] > 0 ? snowW[idx] / landW[idx] : 0
      out.snowAcqIndex[idx] = patch.acqId
    }
    const rgbFrac = Math.min(1, rgbW[idx])
    if (rgbFrac > out.rgbValid[idx] && rgbW[idx] > 0) {
      out.rgbValid[idx] = rgbFrac
      const o = idx * 3
      out.rgb[o] = Math.round(rSum[idx] / rgbW[idx])
      out.rgb[o + 1] = Math.round(gSum[idx] / rgbW[idx])
      out.rgb[o + 2] = Math.round(bSum[idx] / rgbW[idx])
      out.acqIndex[idx] = patch.acqId
    }
    const ndviFrac = Math.min(1, ndviW[idx])
    if (ndviFrac > out.ndviValid[idx] && ndviW[idx] > 0) {
      out.ndviValid[idx] = ndviFrac
      out.ndvi[idx] = ndviSum[idx] / ndviW[idx]
      out.ndviAcqIndex[idx] = patch.acqId
    }
    const ndsiFrac = Math.min(1, ndsiW[idx])
    if (ndsiFrac > out.ndsiValid[idx] && ndsiW[idx] > 0) {
      out.ndsiValid[idx] = ndsiFrac
      out.ndsi[idx] = ndsiSum[idx] / ndsiW[idx]
      out.ndsiAcqIndex[idx] = patch.acqId
    }
  }
}

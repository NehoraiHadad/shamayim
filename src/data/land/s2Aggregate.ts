import { computeNdsi, computeNdvi, isValidScl, type BandScaling } from './s2Math'
import { fromUtm, toUtm } from './utm'

/**
 * Georeferenced aggregation of Sentinel-2 L2A overview patches onto a target UTM metric grid.
 * Tracks SCL validity, RGB, NDVI and NDSI support independently so a black RGB patch or band nodata
 * does not suppress valid sibling measurements, and derives observed snow fraction from SCL class 11
 * over valid non-water pixels (excluding SCL 6 open water).
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
  acqIndex: Uint8Array
}

/** Aggregates a georeferenced S2 patch into the target UTM grid, tracking per-measurement support independently. */
export function aggregatePatch(patch: PatchBands, grid: GridTransform, out: GridBuffers): void {
  const n = grid.size * grid.size
  const totalN = new Uint32Array(n), validN = new Uint32Array(n), landN = new Uint32Array(n), snowN = new Uint32Array(n)
  const rgbN = new Uint32Array(n), rSum = new Uint32Array(n), gSum = new Uint32Array(n), bSum = new Uint32Array(n)
  const ndviN = new Uint32Array(n), ndviSum = new Float64Array(n)
  const ndsiN = new Uint32Array(n), ndsiSum = new Float64Array(n)
  const sameCrs = patch.zone === grid.utmZone && patch.south === grid.utmSouth
  const hasNdvi = Boolean(patch.red && patch.nir && patch.redScale && patch.nirScale)
  const hasNdsi = Boolean(patch.green && patch.swir && patch.greenScale && patch.swirScale)

  for (let py = 0; py < patch.height; py++) {
    const north = patch.north - (py + 0.5) * patch.resY
    for (let px = 0; px < patch.width; px++) {
      const east = patch.west + (px + 0.5) * patch.resX
      let ge = east, gn = north
      if (!sameCrs) {
        const ll = fromUtm(east, north, patch.zone, patch.south)
        const mapped = toUtm(ll.lat, ll.lon, grid.utmZone, grid.utmSouth)
        ge = mapped.e; gn = mapped.n
      }
      const col = Math.floor((ge - grid.originE) / grid.stepM)
      const row = Math.floor((grid.originN - gn) / grid.stepM)
      if (row < 0 || col < 0 || row >= grid.size || col >= grid.size) continue
      const idx = row * grid.size + col, p = py * patch.width + px
      totalN[idx]++
      const s = patch.scl[p]
      if (!isValidScl(s)) continue
      validN[idx]++
      if (s !== 6) { landN[idx]++; if (s === 11) snowN[idx]++ }
      if (patch.visual) {
        const v = p * 3, r = patch.visual[v], g = patch.visual[v + 1], b = patch.visual[v + 2]
        if (r || g || b) { rSum[idx] += r; gSum[idx] += g; bSum[idx] += b; rgbN[idx]++ }
      }
      if (hasNdvi) {
        const v = computeNdvi(patch.red![p], patch.nir![p], patch.redScale!, patch.nirScale!)
        if (v !== null) { ndviSum[idx] += v; ndviN[idx]++ }
      }
      if (hasNdsi) {
        const v = computeNdsi(patch.green![p], patch.swir![p], patch.greenScale!, patch.swirScale!)
        if (v !== null) { ndsiSum[idx] += v; ndsiN[idx]++ }
      }
    }
  }

  const nominalPx = Math.max(1, (grid.stepM / patch.resX) * (grid.stepM / patch.resY))
  for (let idx = 0; idx < n; idx++) {
    if (totalN[idx] === 0) continue
    const denom = Math.max(totalN[idx], nominalPx)
    const sclFrac = Math.min(1, validN[idx] / denom)
    const rgbFrac = Math.min(1, rgbN[idx] / denom)
    const ndviFrac = Math.min(1, ndviN[idx] / denom)
    const ndsiFrac = Math.min(1, ndsiN[idx] / denom)
    if (sclFrac > out.valid[idx]) {
      out.valid[idx] = sclFrac
      out.snow[idx] = landN[idx] > 0 ? snowN[idx] / landN[idx] : 0
    }
    if (rgbFrac > out.rgbValid[idx] && rgbN[idx] > 0) {
      out.rgbValid[idx] = rgbFrac
      const o = idx * 3
      out.rgb[o] = Math.round(rSum[idx] / rgbN[idx])
      out.rgb[o + 1] = Math.round(gSum[idx] / rgbN[idx])
      out.rgb[o + 2] = Math.round(bSum[idx] / rgbN[idx])
      out.acqIndex[idx] = patch.acqId
    }
    if (ndviFrac > out.ndviValid[idx] && ndviN[idx] > 0) {
      out.ndviValid[idx] = ndviFrac
      out.ndvi[idx] = ndviSum[idx] / ndviN[idx]
    }
    if (ndsiFrac > out.ndsiValid[idx] && ndsiN[idx] > 0) {
      out.ndsiValid[idx] = ndsiFrac
      out.ndsi[idx] = ndsiSum[idx] / ndsiN[idx]
    }
  }
}

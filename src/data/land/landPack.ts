import type { FarLandGrid, NearLandGrid } from './types'

/**
 * Compact TypedArray quantization for IndexedDB caching of living-land grids.
 * NDVI/NDSI in `[-1, 1]` pack into `Int8Array` (`-127..127`, `-128` = NaN; max error 0.004),
 * `snow` in `[0, 1]` packs into `Uint8Array` (`0..254`, `255` = NaN), and support fractions pack into
 * `Uint8Array` (`0..255`).
 */

function packUnit(arr: Float32Array): Int8Array {
  const out = new Int8Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    out[i] = Number.isFinite(v) ? Math.max(-127, Math.min(127, Math.round(v * 127))) : -128
  }
  return out
}

function unpackUnit(arr: Int8Array): Float32Array {
  const out = new Float32Array(arr.length)
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] === -128 ? Number.NaN : arr[i] / 127
  return out
}

function packOptFrac(arr: Float32Array): Uint8Array {
  const out = new Uint8Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    out[i] = Number.isFinite(v) ? Math.max(0, Math.min(254, Math.round(v * 254))) : 255
  }
  return out
}

function unpackOptFrac(arr: Uint8Array): Float32Array {
  const out = new Float32Array(arr.length)
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] === 255 ? Number.NaN : arr[i] / 254
  return out
}

function packFrac(arr: Float32Array): Uint8Array {
  const out = new Uint8Array(arr.length)
  for (let i = 0; i < arr.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(arr[i] * 255)))
  return out
}

function unpackFrac(arr: Uint8Array): Float32Array {
  const out = new Float32Array(arr.length)
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] / 255
  return out
}

export interface PackedNearGrid extends Omit<
  NearLandGrid, 'ndvi' | 'ndsi' | 'snow' | 'valid' | 'rgbValid' | 'ndviValid' | 'ndsiValid'
> {
  ndvi: Int8Array
  ndsi: Int8Array
  snow: Uint8Array
  valid: Uint8Array
  rgbValid: Uint8Array
  ndviValid: Uint8Array
  ndsiValid: Uint8Array
}

export function packNearGrid(grid: NearLandGrid): PackedNearGrid {
  return {
    ...grid,
    ndvi: packUnit(grid.ndvi),
    ndsi: packUnit(grid.ndsi),
    snow: packOptFrac(grid.snow),
    valid: packFrac(grid.valid),
    rgbValid: packFrac(grid.rgbValid),
    ndviValid: packFrac(grid.ndviValid),
    ndsiValid: packFrac(grid.ndsiValid),
  }
}

export function unpackNearGrid(packed: PackedNearGrid): NearLandGrid {
  // Strip any legacy sun-angle fields from older cached records while preserving per-granule dates.
  const {
    date, source, fetchedAt, lat, lon, utmZone, utmSouth, originE, originN, reachM, stepM, size,
    rgb, acqIndex, ndviAcqIndex, ndsiAcqIndex, snowAcqIndex, acquisitions,
  } = packed
  return {
    date, source, fetchedAt, lat, lon, utmZone, utmSouth, originE, originN, reachM, stepM, size,
    rgb, acqIndex, ndviAcqIndex, ndsiAcqIndex, snowAcqIndex,
    acquisitions: acquisitions.map((a) => ({ date: a.date })),
    ndvi: unpackUnit(packed.ndvi),
    ndsi: unpackUnit(packed.ndsi),
    snow: unpackOptFrac(packed.snow),
    valid: unpackFrac(packed.valid),
    rgbValid: unpackFrac(packed.rgbValid),
    ndviValid: unpackFrac(packed.ndviValid),
    ndsiValid: unpackFrac(packed.ndsiValid),
  }
}

export interface PackedFarGrid extends Omit<FarLandGrid, 'ndvi'> {
  ndvi: Int8Array
}

export function packFarGrid(grid: FarLandGrid): PackedFarGrid {
  return { ...grid, ndvi: packUnit(grid.ndvi) }
}

export function unpackFarGrid(packed: PackedFarGrid): FarLandGrid {
  return { ...packed, ndvi: unpackUnit(packed.ndvi) }
}

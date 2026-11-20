import type { FarLandGrid, NearLandGrid } from './types'

/**
 * Compact TypedArray quantization for IndexedDB caching of living-land grids.
 * NDVI/NDSI in `[-1, 1]` pack into `Int8Array` (`-127..127`, `-128` = NaN; max error 0.004) and
 * `valid` in `[0, 1]` packs into `Uint8Array` (`0..255`), cutting a 100×100 near grid from 150 KB to 60 KB.
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

export interface PackedNearGrid extends Omit<NearLandGrid, 'ndvi' | 'ndsi' | 'valid'> {
  ndvi: Int8Array
  ndsi: Int8Array
  valid: Uint8Array
}

export function packNearGrid(grid: NearLandGrid): PackedNearGrid {
  return { ...grid, ndvi: packUnit(grid.ndvi), ndsi: packUnit(grid.ndsi), valid: packFrac(grid.valid) }
}

export function unpackNearGrid(packed: PackedNearGrid): NearLandGrid {
  return { ...packed, ndvi: unpackUnit(packed.ndvi), ndsi: unpackUnit(packed.ndsi), valid: unpackFrac(packed.valid) }
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

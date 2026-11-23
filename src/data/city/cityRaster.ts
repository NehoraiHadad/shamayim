import { FRONT_M } from './form'
import { COLS, LAT_STEP, LON_STEP, squareOf, strideFor } from './grid'
import type { RayGrid } from './rayWalk'
import type { CityTower } from './types'

/** Frontage is the typical mapped building width in metres. */
export type RasterSquare = { built: number; levels: number; p90: number; front?: number }
export type CityRaster = {
  /** Whether this point has an actual loaded raster cell, including known unbuilt cells. */
  has?: (lat: number, lon: number) => boolean
  at: (lat: number, lon: number) => RasterSquare
  towers?: readonly CityTower[]
}

export const CITY_GRID: RayGrid = { toGrid: (lat, lon) => [lon / LON_STEP, lat / LAT_STEP] }

const EMPTY: RasterSquare = { built: 0, levels: 0, p90: 0 }

export function cityRaster(grids: ReadonlyMap<string, Uint8Array>, towers: readonly CityTower[] = []): CityRaster {
  return {
    towers,
    has: (lat, lon) => grids.has(squareOf(lat, lon).cell),
    at(lat, lon) {
      const { cell, col, row } = squareOf(lat, lon)
      const bytes = grids.get(cell)
      if (!bytes) return EMPTY
      const stride = strideFor(bytes)
      const i = (row * COLS + col) * stride
      const meta = bytes[i]
      const size = stride === 3 ? bytes[i + 2] & 7 : 0
      return { built: (meta >> 4) / 15, levels: meta & 15, p90: bytes[i + 1],
        ...(size ? { front: FRONT_M[size] } : {}) }
    },
  }
}

import { COLS, LAT_STEP, LON_STEP, squareOf, strideFor } from './grid'
import type { RayGrid } from './rayWalk'
import type { CityTower } from './types'

export type RasterSquare = { built: number; levels: number; p90: number }
export type CityRaster = {
  at: (lat: number, lon: number) => RasterSquare
  towers?: readonly CityTower[]
}

export const CITY_GRID: RayGrid = { toGrid: (lat, lon) => [lon / LON_STEP, lat / LAT_STEP] }

const EMPTY: RasterSquare = { built: 0, levels: 0, p90: 0 }

export function cityRaster(grids: ReadonlyMap<string, Uint8Array>, towers: readonly CityTower[] = []): CityRaster {
  return {
    towers,
    at(lat, lon) {
      const { cell, col, row } = squareOf(lat, lon)
      const bytes = grids.get(cell)
      if (!bytes) return EMPTY
      const i = (row * COLS + col) * strideFor(bytes)
      const meta = bytes[i]
      return { built: (meta >> 4) / 15, levels: meta & 15, p90: bytes[i + 1] }
    },
  }
}

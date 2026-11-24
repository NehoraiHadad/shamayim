import { decodeForm, FRONT_M } from './form'
import { COLS, LAT_STEP, LON_STEP, squareOf, strideFor } from './grid'
import type { RayGrid } from './rayWalk'
import type { CityTower } from './types'

export type RasterSquare = { built: number; levels: number; p90: number }
export type CityRaster = {
  /** Whether this point has an actual loaded raster cell, including known unbuilt cells. */
  has?: (lat: number, lon: number) => boolean
  at: (lat: number, lon: number) => RasterSquare
  /** The typical mapped building's frontage (m) of the square there, where the raster has its size class; else 0. */
  front?: (lat: number, lon: number) => number
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
      const i = (row * COLS + col) * strideFor(bytes)
      const meta = bytes[i]
      return { built: (meta >> 4) / 15, levels: meta & 15, p90: bytes[i + 1] }
    },
    front(lat, lon) {
      const { cell, col, row } = squareOf(lat, lon)
      const bytes = grids.get(cell)
      return bytes && strideFor(bytes) === 3 ? FRONT_M[decodeForm(bytes[(row * COLS + col) * 3 + 2]).size] : 0
    },
  }
}

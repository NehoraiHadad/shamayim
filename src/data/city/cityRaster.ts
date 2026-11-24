import { decodeForm, FRONT_M } from './form'
import { cellKey, LAT_STEP, LON_STEP, squareIndex, strideFor } from './grid'
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
  // A town's points come square by square: the last cell's bytes are kept, so its key is written once a cell, not once a point.
  let south = NaN, west = NaN, bytes: Uint8Array | undefined
  const bytesAt = (lat: number, lon: number) => {
    const s = Math.floor(lat * 10), w = Math.floor(lon * 10)
    if (s !== south || w !== west) { south = s; west = w; bytes = grids.get(cellKey(lat, lon)) }
    return bytes
  }
  return {
    towers,
    has: (lat, lon) => grids.has(cellKey(lat, lon)),
    at(lat, lon) {
      const bytes = bytesAt(lat, lon)
      if (!bytes) return EMPTY
      const i = squareIndex(lat, lon) * strideFor(bytes)
      const meta = bytes[i]
      return { built: (meta >> 4) / 15, levels: meta & 15, p90: bytes[i + 1] }
    },
    front(lat, lon) {
      const bytes = bytesAt(lat, lon)
      return bytes && strideFor(bytes) === 3 ? FRONT_M[decodeForm(bytes[squareIndex(lat, lon) * 3 + 2]).size] : 0
    },
  }
}

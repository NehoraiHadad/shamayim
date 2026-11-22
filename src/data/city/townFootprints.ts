import type { FarData } from './farData'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from './farGrid'

export interface FarFootprint { townId: number; built: number }
const cached = new WeakMap<FarData, ReadonlyMap<number, FarFootprint>>()

/** The source far raster cell, independent of its visibility in any particular panorama. */
export function farCellId({ lat, lon }: { lat: number; lon: number }): number | undefined {
  const row = Math.floor((lat - FAR_SOUTH) / FAR_LAT_STEP)
  const col = Math.floor((lon - FAR_WEST) / FAR_LON_STEP)
  return row >= 0 && row < FAR_ROWS && col >= 0 && col < FAR_COLS ? row * FAR_COLS + col : undefined
}

/** Connected built footprints, using the same eight-neighbour connectivity as the local town clusters. */
export function townFootprints(data: FarData): ReadonlyMap<number, FarFootprint> {
  const previous = cached.get(data)
  if (previous) return previous
  const footprints = new Map<number, FarFootprint>()
  for (let first = 0; first < data.grid.length; first++) {
    if (!(data.grid[first] >> 4) || footprints.has(first)) continue
    const queue = [first]
    footprints.set(first, { townId: first, built: (data.grid[first] >> 4) / 15 })
    for (const index of queue) {
      const row = Math.floor(index / FAR_COLS), col = index % FAR_COLS
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const r = row + dy, c = col + dx, next = r * FAR_COLS + c
        if (r < 0 || r >= FAR_ROWS || c < 0 || c >= FAR_COLS || footprints.has(next) ||
           !(data.grid[next] >> 4)) continue
        footprints.set(next, { townId: first, built: (data.grid[next] >> 4) / 15 })
        queue.push(next)
      }
    }
  }
  cached.set(data, footprints)
  return footprints
}

import type { Coordinate } from '../landmarks/project'
import { decodeLand, LAND_N, LAND_STEP, landCellKey } from './grid'

const ROOT = `${import.meta.env.BASE_URL}data/land/il`
let indexPromise: Promise<{ cells: string[] } | null> | undefined

/** What covers the ground at a point (index into `COVER`; 0 where unknown). */
export interface LandCover {
  coverAt: (lat: number, lon: number) => number
}

/** The land-cover cells within `radiusKm` of a place, or null outside the data. */
export async function loadLandCover(place: Coordinate, signal?: AbortSignal, radiusKm = 6): Promise<LandCover | null> {
  indexPromise ??= fetch(`${ROOT}/index.json`).then(r => r.ok ? r.json() as Promise<{ cells: string[] }> : null).catch(() => null)
  const index = await indexPromise
  if (!index) return null
  const available = new Set(index.cells)
  const dLat = radiusKm / 111.32, dLon = radiusKm / (111.32 * Math.cos((place.lat * Math.PI) / 180))
  const keys: string[] = []
  for (let row = Math.floor((place.lat - dLat) * 10); row <= Math.floor((place.lat + dLat) * 10); row++) {
    for (let col = Math.floor((place.lon - dLon) * 10); col <= Math.floor((place.lon + dLon) * 10); col++) {
      if (available.has(`${row}_${col}`)) keys.push(`${row}_${col}`)
    }
  }
  if (!keys.length) return null
  const grids = new Map(await Promise.all(keys.map(async key => {
    const response = await fetch(`${ROOT}/${key}.json`, { signal })
    if (!response.ok) throw new Error(`Land cell HTTP ${response.status}`)
    const cell = await response.json() as { v: number; r: string }
    return [key, decodeLand(cell.r)] as const
  })))
  return {
    coverAt(lat, lon) {
      const grid = grids.get(landCellKey(lat, lon))
      if (!grid) return 0
      const row = LAND_N - 1 - Math.floor((lat - Math.floor(lat * 10) / 10) / LAND_STEP)
      const col = Math.floor((lon - Math.floor(lon * 10) / 10) / LAND_STEP)
      return grid[Math.max(0, Math.min(LAND_N - 1, row)) * LAND_N + Math.max(0, Math.min(LAND_N - 1, col))]
    },
  }
}

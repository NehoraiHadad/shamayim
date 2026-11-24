import { LAND_STEP } from '../data/land/grid'
import { RAY_DISTANCES } from '../data/terrain/panorama'
import { linearRgbToSrgb } from './landRadiometry'
import { M_PER_DEG } from './landRays'
import type { RGB } from './types'

/**
 * The cover of the ground nearer than the panorama's first DEM ring. The profiles do not say where on a ray that ground
 * lies between the eye and the ring, so its footprint is the whole stretch, as wide as it is deep: the circle with the
 * stretch as its diameter.
 */
export interface CellShare<Cell> { cell: Cell; weight: number }

const RAD = Math.PI / 180
export const FIRST_RING_M = RAY_DISTANCES[0] * 1000
const RADIUS_M = FIRST_RING_M / 2
/** A cover cell, south to north. */
const CELL_M = LAND_STEP * M_PER_DEG

/** What lies under the footprint on a bearing (degrees): each kind of cell once, with its area inside (in cells). A cell is read once for all bearings. */
export function footprintOf<Cell>(
  lat: number, lon: number, cosLat: number, cellAt: (eastM: number, northM: number) => Cell,
): (azimuth: number) => CellShare<Cell>[] {
  // West to east the grid's own columns, however narrow: a column passed over is ground not looked at.
  const eastStep = CELL_M * cosLat
  // From the eye to the centre of its own cell.
  const centre = (deg: number) => (Math.floor(deg / LAND_STEP) + 0.5) * LAND_STEP - deg
  const east0 = centre(lon) * M_PER_DEG * cosLat, north0 = centre(lat) * M_PER_DEG
  const held = new Map<number, Cell>()
  const cellOf = (col: number, row: number) => {
    const key = row * 1024 + col
    if (!held.has(key)) held.set(key, cellAt(east0 + col * eastStep, north0 + row * CELL_M))
    return held.get(key) as Cell
  }
  const reach = RADIUS_M + CELL_M / 2
  return (azimuth) => {
    const east = RADIUS_M * Math.sin(azimuth * RAD), north = RADIUS_M * Math.cos(azimuth * RAD)
    const firstCol = Math.ceil((east - reach - east0) / eastStep), lastCol = Math.floor((east + reach - east0) / eastStep)
    const firstRow = Math.ceil((north - reach - north0) / CELL_M), lastRow = Math.floor((north + reach - north0) / CELL_M)
    const areas = new Map<Cell, number>()
    for (let row = firstRow; row <= lastRow; row++) for (let col = firstCol; col <= lastCol; col++) {
      // The rim crosses a cell over the cell's height, so its share falls from 1 to 0 over that height.
      const d = Math.hypot(col * eastStep + east0 - east, row * CELL_M + north0 - north)
      const weight = Math.min(1, (RADIUS_M - d) / CELL_M + 0.5)
      if (weight <= 0) continue
      const cell = cellOf(col, row)
      areas.set(cell, (areas.get(cell) ?? 0) + weight)
    }
    return Array.from(areas, ([cell, weight]) => ({ cell, weight }))
  }
}

/** One cell of the footprint: dry ground (linear reflectance), open water, or null where no class is known. */
export type GroundCell = { rho: RGB; source: string } | 'water' | null
/** The near ground's colour on a bearing (sRGB-encoded albedo), or open water all through. */
export type NearGround = { albedo: RGB; source: string } | 'water'

/** Of the ground that may be dry, the part the classified dry cells must pass: the mean of half or less says nothing of the rest. */
const MIN_KNOWN_SHARE = 0.5

/** Picks the source label carrying the highest total contribution weight. */
export function dominantWeightedSource(entries: readonly { source: string; weight: number }[]): string {
  const sums = new Map<string, number>()
  for (const { source, weight } of entries) if (weight > 0) sums.set(source, (sums.get(source) ?? 0) + weight)
  let best = entries[0]?.source ?? 'climatology', bestW = -1
  for (const [src, w] of sums) if (w > bestW) { bestW = w; best = src }
  return best
}

/** The dry cells' mean reflectance by area, in linear light; undefined where too little of the ground is classified. */
export function nearGroundOf(shares: readonly CellShare<GroundCell>[]): NearGround | undefined {
  const sum: [number, number, number] = [0, 0, 0], sources: { source: string; weight: number }[] = []
  let dry = 0, unknown = 0
  for (const { cell, weight } of shares) {
    if (cell === null) unknown += weight
    else if (cell !== 'water') {
      dry += weight
      sources.push({ source: cell.source, weight })
      for (let k = 0; k < 3; k++) sum[k] += cell.rho[k] * weight
    }
  }
  if (!dry && !unknown) return shares.length ? 'water' : undefined
  if (dry <= MIN_KNOWN_SHARE * (dry + unknown)) return undefined
  return { albedo: linearRgbToSrgb([sum[0] / dry, sum[1] / dry, sum[2] / dry]), source: dominantWeightedSource(sources) }
}

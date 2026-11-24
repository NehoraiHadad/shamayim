import { LAND_STEP } from '../data/land/grid'
import { RAY_DISTANCES } from '../data/terrain/panorama'
import { M_PER_DEG } from './landRays'
import type { LivingLandSample } from './landSample'

/**
 * The cover of the ground nearer than the panorama's first DEM ring. The profiles do not say where on a ray that ground
 * lies between the eye and the ring, so its footprint is the whole stretch, as wide as it is deep: the circle with the
 * stretch as its diameter. Cover cells are read one by one, when a bearing first asks for them.
 */
export interface GroundShare { sample: LivingLandSample; weight: number }
/** The cells under the footprint on a bearing (degrees), each with the share of its area that lies inside. */
export type NearGround = (azimuth: number) => GroundShare[]

const RAD = Math.PI / 180
export const FIRST_RING_M = RAY_DISTANCES[0] * 1000
const RADIUS_M = FIRST_RING_M / 2
/** A cover cell, south to north. */
const CELL_M = LAND_STEP * M_PER_DEG

export function nearGroundOf(
  lat: number, lon: number, cosLat: number, sampleAt: (eastM: number, northM: number) => LivingLandSample,
): NearGround {
  // West to east the grid's own columns, or every nth of them from 48° on, where they are narrower than half a cell.
  const eastStep = CELL_M * cosLat * Math.max(1, Math.round(1 / cosLat))
  // From the eye to the centre of its own cell.
  const centre = (deg: number) => (Math.floor(deg / LAND_STEP) + 0.5) * LAND_STEP - deg
  const east0 = centre(lon) * M_PER_DEG * cosLat, north0 = centre(lat) * M_PER_DEG
  const held = new Map<string, LivingLandSample>()
  const cell = (col: number, row: number) => {
    const key = `${col}:${row}`
    let sample = held.get(key)
    if (!sample) held.set(key, sample = sampleAt(east0 + col * eastStep, north0 + row * CELL_M))
    return sample
  }
  const reach = RADIUS_M + CELL_M / 2
  return (azimuth) => {
    const east = RADIUS_M * Math.sin(azimuth * RAD), north = RADIUS_M * Math.cos(azimuth * RAD)
    const firstCol = Math.ceil((east - reach - east0) / eastStep), lastCol = Math.floor((east + reach - east0) / eastStep)
    const firstRow = Math.ceil((north - reach - north0) / CELL_M), lastRow = Math.floor((north + reach - north0) / CELL_M)
    const out: GroundShare[] = []
    for (let row = firstRow; row <= lastRow; row++) for (let col = firstCol; col <= lastCol; col++) {
      // The rim crosses a cell over the cell's own width, so its share falls from 1 to 0 over that width.
      const d = Math.hypot(col * eastStep + east0 - east, row * CELL_M + north0 - north)
      const weight = Math.min(1, (RADIUS_M - d) / CELL_M + 0.5)
      if (weight > 0) out.push({ sample: cell(col, row), weight })
    }
    return out
  }
}

import { HOUSE_M } from '../../data/village/cellSource'
import type { VillageFrame } from './frame'

/**
 * How many houses stand for `houses` real ones: Töpfer's radical law (the root of the drawn house over the true one at the
 * picture's mean scale), but never more than would cover the settlement's ellipse once, each house as high as wide.
 */
export function drawnCount(houses: number, { ppm, housePx, widthPx, deepKm }: VillageFrame, depthPx: number): number {
  const mean = Math.sqrt(ppm * depthPx / (deepKm * 1000))
  const law = Math.max(1, Math.sqrt(housePx / (HOUSE_M * mean)))
  return Math.min(houses / law, Math.PI / 4 * widthPx * depthPx / housePx ** 2)
}
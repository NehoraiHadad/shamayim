// Raster catalogue thresholds in metres. The middle class includes its upper bound.
export const TOWER_WIDTH_BOUNDS = [25, 50] as const

export function towerWidthClass(width: number): 0 | 1 | 2 {
  const [middle, wide] = TOWER_WIDTH_BOUNDS
  return width < middle ? 0 : width <= wide ? 1 : 2
}

const [middle, wide] = TOWER_WIDTH_BOUNDS
// Half the first band, geometric centre of the bounded positive band, lower bound of the open band.
export const TOWER_FRONT_M = [middle / 2, Math.sqrt(middle * wide), wide] as const

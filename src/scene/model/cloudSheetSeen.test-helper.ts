import { groundRangeAt } from '../../world/field/project'
import { kernel } from '../../world/field/rasterNodes'
import type { FieldCell } from '../../world/field/types'
import { DOME_ALT, type SkyGeom } from './sky'

export const RAD = Math.PI / 180
export const HEIGHT = 2
// Portrait dome and azimuth scale from the diagnosis. Only the dome and span enter the correction.
export const geom = {
  azimuthRange: { period: 540, min: 0 },
  dome: (alt: number) => alt <= DOME_ALT ? 340 - 1.5 * alt
    : 307 - 289 * ((alt - DOME_ALT) / (90 - DOME_ALT)) ** 0.85,
} as SkyGeom
export const cellAt = (alt: number, r: number, seed = 47): FieldCell => ({
  id: seed, seed, x: 0, y: groundRangeAt(HEIGHT, alt), r, lattice: 'mid', genus: 'ac',
  baseKm: HEIGHT - 0.2 * r, vKm: 0.4 * r, tau0: 7, share: 1, rainWeight: 0, rank: 0,
})

export function alpha(cell: FieldCell, range: number, az: number, delta?: ((x: number, y: number) => number) | null) {
  const x = range * Math.sin(az * RAD), y = range * Math.cos(az * RAD)
  const round = kernel(cell.tau0, ((x - cell.x) ** 2 + (y - cell.y) ** 2) / cell.r ** 2, false)
  return 1 - Math.exp(-Math.max(0, round + (delta?.(x, y) ?? 0)))
}

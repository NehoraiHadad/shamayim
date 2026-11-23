import { cellularRasterRange, RANGES } from './cells'
import { cellRim, rimDistance } from './cellRim'
import { kernel } from './rasterNodes'
import type { FieldCell, FieldLayer } from './types'

/** Squared elliptical radius at a world point, with coordinates in km. */
export function footprintDistance(cell: FieldCell, x: number, y: number): number {
  const dx = x - cell.x
  const dy = y - cell.y
  if (cell.axis === undefined) return rimDistance(cellRim(cell), dx, dy, (dx * dx + dy * dy) / (cell.r * cell.r))
  const angle = cell.axis * Math.PI / 180
  return ((dx * Math.sin(angle) + dy * Math.cos(angle)) / cell.r) ** 2
    + ((dx * Math.cos(angle) - dy * Math.sin(angle)) / (cell.rMinor ?? cell.r)) ** 2
}

/** Vertical optical depth at a world point from one cell. */
export function cellTauAt(cell: FieldCell, x: number, y: number): number {
  const rr = footprintDistance(cell, x, y)
  return kernel(cell.tau0, rr, cell.genus === 'cu' || cell.genus === 'cg' || cell.genus === 'cb')
}

/** Outer raster range in km, including its transition to expected density. */
export function rasterRange(layer: FieldLayer) {
  if (layer.lattice === 'low' || layer.lattice === 'mid') return cellularRasterRange(layer)
  const near = RANGES[layer.lattice][0]
  // Rays at 6° or higher reach the tower mid-height within this distance in the local tangent frame.
  return layer.lattice === 'tower' ? Math.min(near, (layer.baseKm + layer.meanVKm / 2) / Math.tan(Math.PI / 30)) : near
}

import { fieldCell, RANGES, visitCells } from './cells'
import { smoothstep } from './genus'
import { clumpSampler, LATTICES, maxRadius } from './lattice'
import { lambdaOf } from './occupancy'
import { kernel, rasterNodes } from './rasterNodes'

import type { CloudField, FieldCell, FieldLayer, Lattice } from './types'

export { farStrips } from './farDensity'

// For one cell, the kernel gradient is bounded by 2τ₀/rMinor (cumulus) or 4τ₀/rMinor (quartic).
// The bilinear weights give mean squared distance ≤ step²/2, so its interpolation error is
// at most gradient × step/√2, summed over footprints intersecting the sample square.
const stepKm = { low: 0.125, tower: 0.4, mid: 0.4, high: 1.4 }

/** Squared elliptical radius at a world point, with coordinates in km. */
export function footprintDistance(cell: FieldCell, x: number, y: number): number {
  const dx = x - cell.x
  const dy = y - cell.y
  if (cell.axis === undefined) return (dx * dx + dy * dy) / (cell.r * cell.r)
  const angle = cell.axis * Math.PI / 180
  return ((dx * Math.sin(angle) + dy * Math.cos(angle)) / cell.r) ** 2
    + ((dx * Math.cos(angle) - dy * Math.sin(angle)) / (cell.rMinor ?? cell.r)) ** 2
}

/** Vertical optical depth at a world point from one cell. */
export function cellTauAt(cell: FieldCell, x: number, y: number): number {
  const rr = footprintDistance(cell, x, y)
  return kernel(cell.tau0, rr, cell.genus === 'cu' || cell.genus === 'cg' || cell.genus === 'cb')
}

/** Exact raster range, in km, before the outer 15% transition to expected density. */
export function rasterRange(layer: FieldLayer) {
  const near = RANGES[layer.lattice][0]
  // Rays at 6° or higher reach the tower mid-height within this distance in the local tangent frame.
  return layer.lattice === 'tower' ? Math.min(near, (layer.baseKm + layer.meanVKm / 2) / Math.tan(Math.PI / 30)) : near
}

/** Rasterize near cells in the air frame and read optical depth at world x/y in km. t is in minutes. */
export function densityGrid(field: CloudField, lattice: Lattice, cx: number, cy: number, radiusKm: number, t = field.t) {
  return rasterize(field, lattice, cx, cy, radiusKm, t)
}

/** Collect drawable cells and build the density grid with one visit to this layer. */
export function layerSnapshot(field: CloudField, lattice: Lattice, t = field.t) {
  const cells: FieldCell[] = []
  const densityGrid = rasterize(field, lattice, 0, 0, RANGES[lattice][1], t, cells)
  return { cells, densityGrid }
}

function rasterize(field: CloudField, lattice: Lattice, cx: number, cy: number, radiusKm: number, t: number,
  cells?: FieldCell[]) {
  const layer = field.layers.find(item => item.lattice === lattice)
  if (!layer || !layer.cover || radiusKm < 0) return { tauAt: () => 0 }
  const dt = t - field.t
  const { d: [dx, dy], vel } = (dt && layer.motionAt ? layer.motionAt(t) : layer)
  const range = rasterRange(layer)
  const radius = Math.min(radiusKm, range)
  const fadeStart = range * 0.85
  const drawRadius = cells ? RANGES[lattice][0] : 0
  const step = stepKm[lattice]
  const left = Math.floor((cx - dx - radius) / step)
  const bottom = Math.floor((cy - dy - radius) / step)
  const width = Math.ceil((cx - dx + radius) / step) - left + 2
  const height = Math.ceil((cy - dy + radius) / step) - bottom + 2
  const angle = Math.atan2(vel[0], vel[1])
  const sin = Math.sin(angle), cos = Math.cos(angle)
  // Expand the rotated ellipse into a quadratic in the east coordinate.
  const a = lattice === 'high' ? sin * sin + 9 * cos * cos : 1
  const b = lattice === 'high' ? -8 * sin * cos : 0
  const c = lattice === 'high' ? cos * cos + 9 * sin * sin : 1
  const grid = rasterNodes(width, height, a, b, c)
  const sampleRadius = radius + Math.SQRT2 * step
  const rasterVisit = sampleRadius + maxRadius(lattice) * layer.g
  const fadeStartSquared = fadeStart ** 2
  const expectedFromSquared = range ** 2
  const querySquared = radiusKm ** 2
  const drawRadiusSquared = drawRadius ** 2
  visitCells(field, lattice, cx, cy, Math.max(drawRadius, rasterVisit), dt,
    (siteI, siteJ, x, y, r, base, v, tau, share, seed, genus, rank, axis) => {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2
      if (cells && distanceSquared <= drawRadiusSquared) {
        cells.push(fieldCell(lattice, siteI, siteJ, x, y, r, base, v, tau, share, seed, genus, rank, axis))
      }
      if (distanceSquared > (sampleRadius + r) ** 2) return
      const i = (x - dx) / step - left
      const j = (y - dy) / step - bottom
      const gridR = r / step
      const cu = genus === 'cu' || genus === 'cg' || genus === 'cb'
      grid.add(i, j, gridR, tau, cu)
    })
  const intensity = lambdaOf(layer.cover)
  const amplitude = LATTICES[lattice].amplitude
  const meanTau = layer.kappa * layer.meanVKm * (7 / 12)
  const clump = clumpSampler(field.placeId, lattice)
  let lastX = NaN, lastY = NaN, lastExpected = 0
  const expected = (x: number, y: number) => {
    if (x === lastX && y === lastY) return lastExpected
    lastX = x
    lastY = y
    // The disc mean is 1/2 for a paraboloid and 2/3 for a quartic, within 1/12 of their midpoint.
    lastExpected = -meanTau * Math.expm1(-intensity * (1 + amplitude * (clump(x - dx, y - dy) - 0.5)))
    return lastExpected
  }
  return {
    tauAt(x: number, y: number) {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2
      if (distanceSquared > querySquared) return 0
      if (distanceSquared >= expectedFromSquared) return layer.floorTau + expected(x, y)
      const fade = distanceSquared <= fadeStartSquared ? 0 : smoothstep(fadeStart, range, Math.sqrt(distanceSquared))
      if (fade === 1) return layer.floorTau + expected(x, y)
      const u = (x - dx) / step - left
      const v = (y - dy) / step - bottom
      const raster = grid.at(u, v)
      if (!fade) return layer.floorTau + raster
      return layer.floorTau + raster + fade * (expected(x, y) - raster)
    },
  }
}

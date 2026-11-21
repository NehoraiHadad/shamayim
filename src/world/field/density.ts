import { RANGES, visitCells } from './cells'
import { unit } from './genus'
import { clumpAt, LATTICES, maxRadius } from './lattice'
import { lambdaOf } from './occupancy'
import { altitudeOf } from './project'
import type { CloudField, FieldCell, FieldLayer, Lattice } from './types'

// Subdivide nominal 0.25/0.5/1/4 km pixels to resolve narrow cloud kernels.
const stepKm = { low: 0.0625, tower: 0.25, mid: 0.25, high: 1 }

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

function kernel(tau: number, rr: number, cumulus: boolean) {
  return tau * Math.max(0, 1 - (cumulus ? rr : rr * rr))
}

function localIntensity(field: CloudField, layer: FieldLayer, x: number, y: number, dx: number, dy: number) {
  const noise = clumpAt([x - dx, y - dy], layer.lattice, field.placeId)
  return lambdaOf(layer.cover) * (1 + LATTICES[layer.lattice].amplitude * (noise - 0.5))
}

/** Expected far-strip cover per azimuth bin, with centre range and altitudes. */
export function farStrips(field: CloudField, layer: FieldLayer) {
  const [near, far] = RANGES[layer.lattice]
  if (near === far || layer.cover === 0) return []
  const binDeg = layer.lattice === 'high' ? 8 : 4
  const rangeKm = (near + far) / 2
  // Midpoint clump estimate: intensity error is bounded by amplitude × Λ per bin.
  return Array.from({ length: 360 / binDeg }, (_, i) => {
    const az = (i + 0.5) * binDeg
    const rad = az * Math.PI / 180
    const intensity = localIntensity(field, layer, rangeKm * Math.sin(rad), rangeKm * Math.cos(rad), ...layer.d)
    return { az, widthDeg: binDeg, rangeKm, opacity: -Math.expm1(-intensity),
      aFar: altitudeOf(layer.baseKm, far), aTop: altitudeOf(layer.baseKm + layer.meanVKm, near) }
  })
}

/** Rasterize near cells in the air frame and read optical depth at world x/y in km. t is in minutes. */
export function densityGrid(field: CloudField, lattice: Lattice, cx: number, cy: number, radiusKm: number, t = field.t) {
  const layer = field.layers.find(item => item.lattice === lattice)
  if (!layer || !layer.cover || radiusKm < 0) return { tauAt: () => 0 }
  const dt = t - field.t
  const { d: [dx, dy], vel } = (dt && layer.motionAt ? layer.motionAt(t) : layer)
  const radius = Math.min(radiusKm, RANGES[lattice][0])
  const step = stepKm[lattice]
  const left = Math.floor((cx - dx - radius) / step)
  const bottom = Math.floor((cy - dy - radius) / step)
  const width = Math.ceil((cx - dx + radius) / step) - left + 2
  const height = Math.ceil((cy - dy + radius) / step) - bottom + 2
  const grid = new Float32Array(width * height)
  const angle = Math.atan2(vel[0], vel[1])
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)
  visitCells(field, lattice, cx, cy, radius + maxRadius(lattice) * layer.g, dt,
    (_i, _j, x, y, r, _base, _v, tau, _share, _seed, genus) => {
      const i = (x - dx) / step - left
      const j = (y - dy) / step - bottom
      const gridR = r / step
      const cu = genus === 'cu' || genus === 'cg' || genus === 'cb'
      // Expand the rotated ellipse into a quadratic in the east coordinate.
      const a = lattice === 'high' ? sin * sin + 9 * cos * cos : 1
      const b = lattice === 'high' ? -8 * sin * cos : 0
      const c = lattice === 'high' ? cos * cos + 9 * sin * sin : 1
      const r2 = gridR * gridR
      for (let row = Math.max(0, Math.ceil(j - gridR)); row <= Math.min(height - 1, j + gridR); row++) {
        const north = row - j
        const centre = -b * north / a
        const half = Math.sqrt(Math.max(0, (r2 - c * north * north) / a + centre * centre))
        const rowStart = row * width
        const end = Math.min(width - 1, Math.floor(i + centre + half))
        const constant = c * north * north
        for (let col = Math.max(0, Math.ceil(i + centre - half)); col <= end; col++) {
          const east = col - i
          const rr = ((a * east + 2 * b * north) * east + constant) / r2
          grid[rowStart + col] += kernel(tau, rr, cu)
        }
      }
    })
  return {
    tauAt(x: number, y: number) {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2
      if (distanceSquared > radiusKm ** 2) return 0
      if (distanceSquared > radius ** 2) {
        // Unresolved cover times the mean thickness profile (disc mean 1/2 to 2/3).
        return layer.floorTau + layer.kappa * layer.meanVKm * (7 / 12)
          * -Math.expm1(-localIntensity(field, layer, x, y, dx, dy))
      }
      const u = (x - dx) / step - left
      const v = (y - dy) / step - bottom
      const i = Math.floor(u)
      const j = Math.floor(v)
      const f = unit(u - i)
      const g = unit(v - j)
      const p = j * width + i
      return layer.floorTau + (1 - g) * ((1 - f) * grid[p] + f * grid[p + 1])
        + g * ((1 - f) * grid[p + width] + f * grid[p + width + 1])
    },
  }
}

import { fieldCell, RANGES, visitCells } from './cells'
import { smoothstep } from './genus'
import { clumpAt, LATTICES, maxRadius } from './lattice'
import { lambdaOf } from './occupancy'
import { altitudeOf } from './project'
import type { CloudField, FieldCell, FieldLayer, Lattice } from './types'

const stepKm = { low: 0.125, tower: 0.5, mid: 0.5, high: 1 }

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

function localIntensity(placeId: string, lattice: Lattice, x: number, y: number, intensity: number, amplitude: number) {
  const noise = clumpAt(x, y, lattice, placeId)
  return intensity * (1 + amplitude * (noise - 0.5))
}

/** Expected far-strip cover per azimuth bin, with centre range and altitudes. */
export function farStrips(field: CloudField, layer: FieldLayer) {
  const [near, far] = RANGES[layer.lattice]
  if (near === far || layer.cover === 0) return []
  const binDeg = layer.lattice === 'high' ? 8 : 4
  const rangeKm = (near + far) / 2
  const [dx, dy] = layer.d
  const baseline = lambdaOf(layer.cover)
  const amplitude = LATTICES[layer.lattice].amplitude
  // Midpoint clump estimate: intensity error is bounded by amplitude × Λ per bin.
  return Array.from({ length: 360 / binDeg }, (_, i) => {
    const az = (i + 0.5) * binDeg
    const rad = az * Math.PI / 180
    const intensity = localIntensity(field.placeId, layer.lattice, rangeKm * Math.sin(rad) - dx, rangeKm * Math.cos(rad) - dy,
      baseline, amplitude)
    return { az, widthDeg: binDeg, rangeKm, opacity: -Math.expm1(-intensity),
      aFar: altitudeOf(layer.baseKm, far), aTop: altitudeOf(layer.baseKm + layer.meanVKm, near) }
  })
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
  const tilesWide = Math.ceil(width / 32)
  const tiles: (Float32Array | undefined)[] = new Array(tilesWide * Math.ceil(height / 32))
  const angle = Math.atan2(vel[0], vel[1])
  const sin = Math.sin(angle), cos = Math.cos(angle)
  // Expand the rotated ellipse into a quadratic in the east coordinate.
  const a = lattice === 'high' ? sin * sin + 9 * cos * cos : 1
  const b = lattice === 'high' ? -8 * sin * cos : 0
  const c = lattice === 'high' ? cos * cos + 9 * sin * sin : 1
  const rasterVisit = radius + maxRadius(lattice) * layer.g + Math.SQRT2 * step
  const rasterVisitSquared = rasterVisit ** 2
  const drawRadiusSquared = drawRadius ** 2
  visitCells(field, lattice, cx, cy, Math.max(drawRadius, rasterVisit), dt,
    (siteI, siteJ, x, y, r, base, v, tau, share, seed, genus, rank, axis) => {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2
      if (cells && distanceSquared <= drawRadiusSquared) {
        cells.push(fieldCell(lattice, siteI, siteJ, x, y, r, base, v, tau, share, seed, genus, rank, axis))
      }
      if (distanceSquared > rasterVisitSquared) return
      const i = (x - dx) / step - left
      const j = (y - dy) / step - bottom
      const gridR = r / step
      const cu = genus === 'cu' || genus === 'cg' || genus === 'cb'
      const invR2 = 1 / (gridR * gridR)
      for (let row = Math.max(0, Math.ceil(j - gridR)); row <= Math.min(height - 1, j + gridR); row++) {
        const north = row - j
        const centre = -b * north / a
        const half = Math.sqrt(Math.max(0, (gridR * gridR - c * north * north) / a + centre * centre))
        const end = Math.min(width - 1, Math.floor(i + centre + half))
        const constant = c * north * north
        const tileRow = (row >> 5) * tilesWide
        const rowOffset = (row & 31) << 5
        for (let col = Math.max(0, Math.ceil(i + centre - half)); col <= end;) {
          const tileIndex = tileRow + (col >> 5)
          const tile = tiles[tileIndex] ??= new Float32Array(32 * 32)
          const tileEnd = Math.min(end, col | 31)
          for (; col <= tileEnd; col++) {
            const east = col - i
            const rr = ((a * east + 2 * b * north) * east + constant) * invR2
            tile[rowOffset + (col & 31)] += kernel(tau, rr, cu)
          }
        }
      }
    })
  const read = (i: number, j: number) =>
    tiles[(j >> 5) * tilesWide + (i >> 5)]?.[((j & 31) << 5) + (i & 31)] ?? 0
  const intensity = lambdaOf(layer.cover)
  const amplitude = LATTICES[lattice].amplitude
  const meanTau = layer.kappa * layer.meanVKm * (7 / 12)
  const expected = (x: number, y: number) =>
    // The disc mean is 1/2 for a paraboloid and 2/3 for a quartic, within 1/12 of their midpoint.
    -meanTau * Math.expm1(-localIntensity(field.placeId, lattice, x - dx, y - dy, intensity, amplitude))
  return {
    tauAt(x: number, y: number) {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2
      if (distanceSquared > radiusKm ** 2) return 0
      if (distanceSquared > radius ** 2) return layer.floorTau + expected(x, y)
      const u = (x - dx) / step - left
      const v = (y - dy) / step - bottom
      const i = Math.floor(u)
      const j = Math.floor(v)
      const f = u - i
      const g = v - j
      const col = i & 31
      const row = j & 31
      const p = (row << 5) + col
      const tile = tiles[(j >> 5) * tilesWide + (i >> 5)]
      const raster = col !== 31 && row !== 31
        ? tile ? (1 - g) * ((1 - f) * tile[p] + f * tile[p + 1])
          + g * ((1 - f) * tile[p + 32] + f * tile[p + 33]) : 0
        : (1 - g) * ((1 - f) * read(i, j) + f * read(i + 1, j))
          + g * ((1 - f) * read(i, j + 1) + f * read(i + 1, j + 1))
      if (distanceSquared <= fadeStart ** 2) return layer.floorTau + raster
      const fade = smoothstep(fadeStart, range, Math.sqrt(distanceSquared))
      return layer.floorTau + raster + fade * (expected(x, y) - raster)
    },
  }
}

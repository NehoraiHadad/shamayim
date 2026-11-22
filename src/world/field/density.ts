import { fieldCell, RANGES, visitCells } from './cells'
import { smoothstep } from './genus'
import { expectedClumpSampler, LATTICES, maxRadius } from './lattice'
import { lambdaOf } from './occupancy'
import { kernel, rasterNodes } from './rasterNodes'

import type { CloudField, FieldCell, FieldLayer, Lattice } from './types'

export { farStrips } from './farDensity'
export { shadowTau } from './shadowTau'

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

/** Index near cells and read optical depth at world x/y in km. t is in minutes. */
export function densityGrid(field: CloudField, lattice: Lattice, cx: number, cy: number, radiusKm: number, t = field.t) {
  return rasterize(field, lattice, cx, cy, radiusKm, t)
}

/** Collect drawable cells and build the density grid with one visit to this layer. */
export function layerSnapshot(field: CloudField, lattice: Lattice, cx: number, cy: number, radiusKm: number, t = field.t) {
  const cells: FieldCell[] = []
  const densityGrid = rasterize(field, lattice, cx, cy, radiusKm, t, cells)
  const layer = field.layers.find(item => item.lattice === lattice)
  return { cells, densityGrid, layer, heightKm: layer ? layer.baseKm + layer.meanVKm / 2 : 0 }
}

function rasterize(field: CloudField, lattice: Lattice, cx: number, cy: number, radiusKm: number, t: number,
  cells?: FieldCell[]) {
  const layer = field.layers.find(item => item.lattice === lattice)
  if (!layer || !layer.cover || radiusKm < 0) {
    const floor = () => layer?.floorTau ?? 0
    return { tauAt: floor, expectedTauAt: floor, queryRadius: radiusKm, cellAt: () => undefined, rayDepthAt: () => 0, rayCells: () => new Set<FieldCell>(), rayRange: 0, meanRayDepth: () => 0 }
  }
  const dt = t - field.t
  const { d: [dx, dy], vel } = (dt && layer.motionAt ? layer.motionAt(t) : layer)
  const range = rasterRange(layer)
  const radius = Math.min(radiusKm, range)
  const fadeStart = range * 0.85
  const drawRadius = cells ? Math.min(radiusKm, RANGES[lattice][0]) : 0
  const step = LATTICES[lattice].pitch
  const left = cx - radius
  const bottom = cy - radius
  const width = Math.floor(2 * radius / step) + 1
  const angle = Math.atan2(vel[0], vel[1])
  const sin = Math.sin(angle), cos = Math.cos(angle)
  // Expand the rotated ellipse into a quadratic in the east coordinate.
  const a = lattice === 'high' ? sin * sin + 9 * cos * cos : 1
  const b = lattice === 'high' ? -8 * sin * cos : 0
  const c = lattice === 'high' ? cos * cos + 9 * sin * sin : 1
  const grid = rasterNodes(left, bottom, width, width, step, a, b, c)
  const rasterVisit = radius + maxRadius(lattice) * layer.g
  const fadeStartSquared = fadeStart ** 2
  const expectedFromSquared = range ** 2
  const querySquared = radiusKm ** 2
  const rasterSquared = radius ** 2
  const { floorTau: floor, baseKm, meanVKm } = layer
  const drawRadiusSquared = drawRadius ** 2
  visitCells(field, lattice, cx, cy, Math.max(drawRadius, rasterVisit), dt,
    (siteI, siteJ, x, y, r, base, v, tau, share, seed, genus, rank, axis) => {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2
      const draw = cells && distanceSquared <= drawRadiusSquared
      const sample = distanceSquared <= (radius + r) ** 2
      if (!draw && !sample) return
      const cell = fieldCell(lattice, siteI, siteJ, x, y, r, base, v, tau, share, seed, genus, rank, axis, field.rain)
      if (draw) cells.push(cell)
      if (sample) grid.add(cell, genus === 'cu' || genus === 'cg' || genus === 'cb')
    })
  const intensity = lambdaOf(layer.cover)
  const amplitude = LATTICES[lattice].amplitude * (1 - (1 - 0.2 / 0.35) * layer.form.strat)
  const clumpScale = -intensity * amplitude
  const clearBaseline = -intensity - clumpScale / 2
  const extinction = layer.meanExtinction ?? 1
  const clump = expectedClumpSampler(field.placeId, lattice)
  // Boolean-model log transmission is intensity times the mean extinction of one footprint.
  // The clump approximation contributes at most extinction × intensity × amplitude × 0.01172.
  const localIntensity = (x: number, y: number) =>
    -(clearBaseline + clumpScale * clump(x - dx, y - dy))
  function meanRayDepth(x: number, y: number, low: number, high: number, ds: number) {
    const overlap = Math.min(high, baseKm + meanVKm) - Math.max(low, baseKm)
    if (overlap <= 0) return 0
    const scale = ds * overlap / ((high - low) * meanVKm)
    const d = Math.hypot(x - cx, y - cy)
    const fade = smoothstep(fadeStart, range, d)
    return scale * (floor + (fade ? fade * localIntensity(x, y) * extinction : 0))
  }
  return {
    queryRadius: radiusKm,
    expectedTauAt: (x: number, y: number) => floor + extinction * localIntensity(x, y),
    rayDepthAt(x: number, y: number, low: number, high: number, ds: number, patches: Map<FieldCell, number>) {
      const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2
      const fade = distanceSquared >= expectedFromSquared ? 1
        : distanceSquared <= fadeStartSquared ? 0 : smoothstep(fadeStart, range, Math.sqrt(distanceSquared))
      const exact = fade < 1 ? grid.rayDepthAt(x, y, low, high, ds * (1 - fade), patches) : 0
      return exact + meanRayDepth(x, y, low, high, ds)
    },
    rayRange: range,
    rayCells(east: number, north: number, start: number, end: number) {
      const cells = new Set<FieldCell>()
      for (let d = start; d <= end;) {
        const next = Math.min(end, d + step)
        grid.collect(d * east, d * north, next * east, next * north, cells)
        if (next === end) break
        d = next
      }
      return cells
    },
    meanRayDepth,
    cellAt(x: number, y: number) {
      return (x - cx) ** 2 + (y - cy) ** 2 <= rasterSquared ? grid.cellAt(x, y) : undefined
    },
    tauAt(x: number, y: number) {
      const east = x - cx, north = y - cy
      const distanceSquared = east * east + north * north
      if (distanceSquared > querySquared) return floor
      if (distanceSquared <= fadeStartSquared) return floor + grid.at(x, y)
      const ambient = extinction * localIntensity(x, y)
      if (distanceSquared >= expectedFromSquared) return floor + ambient
      const fade = smoothstep(fadeStart, range, Math.sqrt(distanceSquared))
      const raster = grid.at(x, y)
      // Blend transmissions so the raster's ensemble mean survives the transition.
      const transmission = (1 - fade) * Math.exp(-raster) + fade * Math.exp(-ambient)
      return floor - Math.log(transmission)
    },
  }
}

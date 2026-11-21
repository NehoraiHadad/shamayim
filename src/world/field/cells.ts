import { dimensions } from './field'
import { genusOf, smoothstep, unit } from './genus'
import { centerSites, LATTICES, maxRadius, siteAt, siteCache } from './lattice'
import type { CloudField, FieldCell, Lattice } from './types'

/** Individual and panorama ranges in km. */
export const RANGES = {
  low: [10, 50], tower: [80, 80], mid: [40, 110], high: [120, 250],
} as const

/** Visit occupied sites whose centres lie within radiusKm, at the exact motion keyframe. */
export function visitCells(field: CloudField, lattice: Lattice, x: number, y: number, radiusKm: number,
  dtMin: number, emit: (i: number, j: number, east: number, north: number, r: number,
    baseKm: number, vKm: number, tau0: number, share: number, seed: number, genus: FieldCell['genus'],
    rank: number, axis: number | undefined) => void) {
  const layer = field.layers.find(candidate => candidate.lattice === lattice)
  if (!layer || layer.Q === 0) return
  const { form, Q, g } = layer
  const { d: [dx, dy], vel } = (dtMin && layer.motionAt ? layer.motionAt(field.t + dtMin) : layer)
  const axis = lattice === 'high' ? (Math.atan2(vel[0], vel[1]) * 180 / Math.PI + 360) % 360 : undefined
  const { pitch } = LATTICES[lattice]
  const cache = siteCache(field.placeId, lattice)
  const qi = (x - dx) / pitch
  const qj = (y - dy) / pitch
  const radiusSites = radiusKm / pitch + 0.35
  const minI = Math.ceil(qi - radiusSites)
  const maxI = Math.floor(qi + radiusSites)
  const minJ = Math.ceil(qj - radiusSites)
  const maxJ = Math.floor(qj + radiusSites)
  const radiusSquared = radiusKm ** 2
  // Suppress residual occupancy smoothly as the forecast clears.
  const fade = smoothstep(0, 0.125, Q)
  const t = field.t + dtMin
  for (let startJ = minJ; startJ <= maxJ; startJ += 96) {
    const endJ = Math.min(startJ + 95, maxJ)
    for (let startI = minI; startI <= maxI; startI += 96) {
      const endI = Math.min(startI + 95, maxI)
      const block = centerSites(cache, (startI + endI) >> 1, (startJ + endJ) >> 1,
        Math.ceil((endI - startI) / 2), Math.ceil((endJ - startJ) / 2))
      const data = block.data
      for (let j = startJ; j <= endJ; j++) {
        for (let i = startI; i <= endI; i++) {
          const p = siteAt(cache, block, lattice, i, j)
          const u = data[p + 3]
          // Clumping can lower rank by up to amplitude / 2 and the lifecycle by 0.08.
          if (u > Q + 0.205 + LATTICES[lattice].amplitude / 2) continue
          const east = data[p] + dx
          const north = data[p + 1] + dy
          if ((east - x) ** 2 + (north - y) ** 2 > radiusSquared) continue
          const genus = genusOf(lattice, form, data[p + 7])
          const period = genus === 'sc' || genus === 'st' ? 60 + 6 * (data[p + 5] - 20) : data[p + 5]
          const amplitude = genus === 'sc' ? 0.2 / 0.35 : 1
          // Maximum intrinsic share change is 1.5 / 0.25 × 0.08 × 2 sin(pi / 20) < 0.15.
          const rank = unit(u + amplitude * data[p + 8]) + 0.08 * Math.sin(2 * Math.PI * (t / period + data[p + 6]))
          if (rank > Q + 0.25) continue
          const share = fade * smoothstep(-0.125, 0.125, Q - rank)
          if (share <= 0) continue
          const r = data[p + 2] * g
          const { baseKm, vKm, kappa } = dimensions(genus, layer.lowBaseKm ?? layer.baseKm, form, data[p + 4], 2 * r)
          emit(i, j, east, north, r * Math.sqrt(share), baseKm, vKm, kappa * vKm * share,
            share, data[p + 9], genus, rank, axis)
        }
      }
    }
  }
}

/** Enumerate occupied centres within the layer's individual range, in km. */
export function cellsAround(field: CloudField, lattice: Lattice, x: number, y: number, radiusKm: number,
  dtMin = 0): FieldCell[] {
  return collect(field, lattice, x, y, Math.min(radiusKm, RANGES[lattice][0]), dtMin)
}

function collect(field: CloudField, lattice: Lattice, x: number, y: number, radiusKm: number, dtMin: number) {
  const cells: FieldCell[] = []
  visitCells(field, lattice, x, y, radiusKm, dtMin, (i, j, east, north, r, baseKm, vKm, tau0, share, seed, genus, rank, axis) => {
    cells.push({ id: `${lattice}:${i}:${j}`, lattice, x: east, y: north, r, baseKm, vKm, tau0,
      share, seed, genus, rank, axis, rMinor: axis === undefined ? undefined : r / 3 })
  })
  return cells
}

/** Enumerate all occupied centres that could cover the query point, in km. */
export function cellsAt(field: CloudField, lattice: Lattice, x: number, y: number): FieldCell[] {
  const g = field.layers.find(layer => layer.lattice === lattice)?.g ?? 1
  return collect(field, lattice, x, y, maxRadius(lattice) * g, 0)
}

import { dimensions } from './field'
import { genusOf, smoothstep, unit } from './genus'
import { centerSites, LATTICES, maxRadius, siteAt, siteCache } from './lattice'
import { shareOf } from './occupancy'
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
  const { pitch, amplitude: clumpAmplitude } = LATTICES[lattice]
  const cache = siteCache(field.placeId, lattice)
  const qi = (x - dx) / pitch
  const qj = (y - dy) / pitch
  const radiusInSites = radiusKm / pitch
  const radiusSites = radiusInSites + 0.35
  const radiusInSitesSquared = radiusInSites * radiusInSites
  const minI = Math.ceil(qi - radiusSites)
  const maxI = Math.floor(qi + radiusSites)
  const minJ = Math.ceil(qj - radiusSites)
  const maxJ = Math.floor(qj + radiusSites)
  const radiusSquared = radiusKm ** 2
  const t = field.t + dtMin
  const storm = lattice === 'tower' ? smoothstep(0.6, 1, form.conv) : 0
  const w = form.strat
  const amplitude = 1 + (0.2 / 0.35 - 1) * w
  const rankLimit = Q + 0.2 + clumpAmplitude * amplitude / 2
  const periodScale = lattice === 'tower' ? 3 : 1
  for (let startJ = minJ; startJ <= maxJ; startJ += 96) {
    const endJ = Math.min(startJ + 95, maxJ)
    for (let startI = minI; startI <= maxI; startI += 96) {
      const endI = Math.min(startI + 95, maxI)
      const block = centerSites(cache, (startI + endI) >> 1, (startJ + endJ) >> 1,
        Math.ceil((endI - startI) / 2), Math.ceil((endJ - startJ) / 2))
      const data = block.data
      for (let j = startJ; j <= endJ; j++) {
        // A site can shift by at most 0.35 pitch on each axis before the exact circle test.
        const north = Math.max(0, Math.abs(j - qj) - 0.35)
        const half = Math.sqrt(Math.max(0, radiusInSitesSquared - north * north)) + 0.35
        const first = Math.max(startI, Math.ceil(qi - half))
        const last = Math.min(endI, Math.floor(qi + half))
        for (let i = first; i <= last; i++) {
          const p = siteAt(cache, block, lattice, i, j)
          const u = data[p + 3]
          // Clumping can lower rank by up to half its amplitude and the lifecycle by 0.075.
          if (u > rankLimit) continue
          const east = data[p] + dx
          const north = data[p + 1] + dy
          if ((east - x) ** 2 + (north - y) ** 2 > radiusSquared) continue
          // Tower lifetimes use a 60-minute minimum. With the 1/60 per-minute rank-space
          // fade, share changes by at most 6 × (1/60 + .15 sin(π/60)) < .148 at fixed low cover.
          const period = periodScale * data[p + 5]
          const phase = data[p + 6]
          const cu = w < 1 ? Math.sin(2 * Math.PI * (t / period + phase)) : 0
          const sc = w > 0 ? Math.sin(2 * Math.PI * (t / (60 + 6 * (period - 20)) + phase)) : 0
          // For fixed weather, the maximum one-minute share change is 6 × 0.075 × 2 sin(π/20) ≈ 0.141.
          const rank = unit(u + amplitude * data[p + 8]) + 0.075 * ((1 - w) * cu + w * sc)
          const share = shareOf(rank, Q)
          if (share <= 0) continue
          const genus = genusOf(lattice, form, data[p + 7], storm)
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
  visitCells(field, lattice, x, y, radiusKm, dtMin, (...args) => {
    cells.push(fieldCell(lattice, ...args))
  })
  return cells
}

/** Materialize the primitive values from a visit for drawing or exact sampling. */
export function fieldCell(lattice: Lattice, i: number, j: number, x: number, y: number, r: number,
  baseKm: number, vKm: number, tau0: number, share: number, seed: number, genus: FieldCell['genus'],
  rank: number, axis: number | undefined): FieldCell {
  // Pack two signed 25-bit site coordinates and a two-bit lattice tag into an exact JS integer.
  const side = 2 ** 25, bias = side / 2
  const id = i >= -bias && i < bias && j >= -bias && j < bias
    ? ((i + bias) * side + j + bias) * 4 + latticeTag[lattice]
    : `${lattice}:${i}:${j}`
  return { id, lattice, x, y, r, baseKm, vKm, tau0, share, seed, genus, rank, axis,
    rainWeight: genus === 'cg' || genus === 'cb' || genus === 'ns' ? share : 0,
    rMinor: axis === undefined ? undefined : r / 3 }
}

const latticeTag = { low: 0, tower: 1, mid: 2, high: 3 }

/** Enumerate all occupied centres that could cover the query point, in km. */
export function cellsAt(field: CloudField, lattice: Lattice, x: number, y: number): FieldCell[] {
  const g = field.layers.find(layer => layer.lattice === lattice)?.g ?? 1
  return collect(field, lattice, x, y, maxRadius(lattice) * g, 0)
}

import { dimensions } from './field'
import { genusOf, unit } from './genus'
import { centerSites, LATTICES, siteAt } from './lattice'
import { shareOf } from './occupancy'
import type { CloudField, FieldCell, FieldLayer, Lattice } from './types'

function cellAt(field: CloudField, layer: FieldLayer, i: number, j: number, dx: number, dy: number, t: number,
  x: number, y: number, radiusKm: number): FieldCell | undefined {
  const { lattice, form, Q, g } = layer
  const site = siteAt(field.placeId, lattice, i, j)
  const east = site.x + dx
  const north = site.y + dy
  if ((east - x) ** 2 + (north - y) ** 2 > radiusKm ** 2) return
  const genus = genusOf(lattice, form, site.u)
  // Convert the low lattice's Cu lifetime percentile to the stratiform range.
  const [minPeriod, maxPeriod] = LATTICES.low.period
  const periodMin = genus === 'sc' || genus === 'st'
    ? 60 + 120 * (site.lifePeriod - minPeriod) / (maxPeriod - minPeriod)
    : site.lifePeriod
  const amplitude = genus === 'sc' ? 0.2 / 0.35 : 1
  const rank = unit(site.u + amplitude * site.clump) + 0.12 * Math.sin(2 * Math.PI * (t / periodMin + site.lifePhase))
  const share = shareOf(rank, Q)
  if (share <= 0) return
  const fullRadiusKm = site.r0 * g
  const { baseKm, vKm, kappa } = dimensions(genus, layer.baseKm, form, site.aspect, 2 * fullRadiusKm)
  return {
    id: `${lattice}:${i}:${j}`, lattice, x: east, y: north, r: fullRadiusKm * Math.sqrt(share),
    baseKm, vKm, tau0: kappa * vKm * share, share, seed: site.seed, genus, rank,
    ...(site.axis === undefined ? {} : { axis: site.axis }),
  }
}

function query(field: CloudField, lattice: Lattice, x: number, y: number, radiusKm: number, dtMin: number) {
  const layer = field.layers.find(candidate => candidate.lattice === lattice)
  if (!layer || layer.Q === 0) return []
  const pitch = LATTICES[lattice].pitch
  // Holding velocity at the snapshot is within 70 m over one minute for hourly winds capped at 250 km/h.
  const dx = layer.d[0] + dtMin * layer.vel[0]
  const dy = layer.d[1] + dtMin * layer.vel[1]
  centerSites(field.placeId, lattice, Math.round(-dx / pitch), Math.round(-dy / pitch))
  const qi = (x - dx) / pitch
  const qj = (y - dy) / pitch
  const radiusSites = radiusKm / pitch + 0.35
  const neighbours = layer.g > 1.5 ? 2 : 1
  const local = radiusKm === Infinity
  const minI = local ? Math.round(qi) - neighbours : Math.ceil(qi - radiusSites)
  const maxI = local ? Math.round(qi) + neighbours : Math.floor(qi + radiusSites)
  const minJ = local ? Math.round(qj) - neighbours : Math.ceil(qj - radiusSites)
  const maxJ = local ? Math.round(qj) + neighbours : Math.floor(qj + radiusSites)
  const cells: FieldCell[] = []
  for (let j = minJ; j <= maxJ; j++) {
    for (let i = minI; i <= maxI; i++) {
      const cell = cellAt(field, layer, i, j, dx, dy, field.t + dtMin, x, y, radiusKm)
      if (cell) cells.push(cell)
    }
  }
  return cells
}

/** Enumerate occupied centres within a radius in km, optionally at a motion keyframe. */
export function cellsAround(field: CloudField, lattice: Lattice, x: number, y: number, radiusKm: number, dtMin = 0): FieldCell[] {
  return query(field, lattice, x, y, radiusKm, dtMin)
}

/** Enumerate occupied sites in the local 3×3 or 5×5 neighbourhood. */
export function cellsAt(field: CloudField, lattice: Lattice, x: number, y: number): FieldCell[] {
  return query(field, lattice, x, y, Infinity, 0)
}

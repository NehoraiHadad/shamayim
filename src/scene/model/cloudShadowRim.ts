import { seeded } from '../../data/landmarks/hash'
import type { WorldCloudField } from '../../world/cloudField'
import { midnightCells, RANGES } from '../../world/field/cells'
import { rasterRange } from '../../world/field/footprint'
import { HALF_WINDOW, nearestMidnight } from '../../world/field/handover'
import { smoothstep } from '../../world/field/genus'
import { maxRadius } from '../../world/field/lattice'
import type { FieldCell, Genus } from '../../world/field/types'

const relief: Partial<Record<Genus, number>> = { sc: .16, cu: .18, st: .065, ac: .13, as: .075, ns: .09 }

/** Seeded relief for the ground shadow. Squared radius has zero mean perturbation. */
export function cellRim({ genus, seed }: FieldCell) {
  const amplitude = relief[genus]
  if (!amplitude) return undefined
  const random = seeded(seed)
  const a = 2 * Math.PI * random(), b = 2 * Math.PI * random()
  return [amplitude * Math.cos(a), amplitude * Math.sin(a),
    .55 * amplitude * Math.cos(b), .55 * amplitude * Math.sin(b)] as const
}

export function rimRadiusSquared([a, b, c, d]: NonNullable<ReturnType<typeof cellRim>>, x: number, y: number) {
  const x2 = x * x, y2 = y * y, xy = x * y
  return 1 + a * x * (x2 - 3 * y2) + b * y * (3 * x2 - y2)
    + c * (1 - 8 * xy * xy) + d * 4 * xy * (x2 - y2)
}

export function shadowRimHandover({ field, snapshot }: WorldCloudField) {
  const midnight = nearestMidnight(field.t), offset = field.t - midnight
  if (Math.abs(offset) >= HALF_WINDOW) return
  const weight = smoothstep(-HALF_WINDOW, HALF_WINDOW, offset)
  const seeds = new Map<FieldCell['id'], number>()
  for (const { layer, cells, densityGrid } of snapshot) {
    if (!layer?.dayMotion || layer.lattice === 'high' || !cells.length) continue
    const { lattice, g } = layer, { queryRadius } = densityGrid
    // Use the same visit domain as the snapshot, so both calls read the same midnight match.
    const radius = Math.max(Math.min(queryRadius, RANGES[lattice][0]), Math.min(queryRadius, rasterRange(layer)) + maxRadius(lattice) * g)
    const { incoming, pairs } = midnightCells(field, layer, 0, 0, radius, field.t, midnight)
    const next = new Map(incoming.map(cell => [cell.id, cell.seed]))
    for (const [from, to] of pairs) seeds.set(from, next.get(to)!)
  }
  return { weight, seeds }
}

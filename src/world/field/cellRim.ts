import { seeded } from '../../data/landmarks/hash'
import type { FieldCell, Genus, Lattice } from './types'

const relief: Partial<Record<Genus, number>> = { sc: .16, cu: .18, st: .065, ac: .13, as: .075, ns: .09 }

/** The resolved sheet's seeded plan outline. The harmonics perturb squared
 * radius with zero angular mean, preserving footprint area and extinction. */
export function cellRim({ genus, seed }: FieldCell) {
  const amplitude = relief[genus]
  if (!amplitude) return undefined
  const random = seeded(seed)
  const a = 2 * Math.PI * random(), b = 2 * Math.PI * random()
  return [amplitude * Math.cos(a), amplitude * Math.sin(a),
    .55 * amplitude * Math.cos(b), .55 * amplitude * Math.sin(b)] as const
}

// The largest possible outline is sqrt(1 + .18 * 1.55) times the nominal radius.
const CELL_RIM_REACH = 1.132
export const rimReach = (lattice: Lattice) => lattice === 'low' || lattice === 'mid' ? CELL_RIM_REACH : 1

export function rimRadiusSquared([a, b, c, d]: NonNullable<ReturnType<typeof cellRim>>, x: number, y: number) {
  const x2 = x * x, y2 = y * y, xy = x * y
  return 1 + a * x * (x2 - 3 * y2) + b * y * (3 * x2 - y2)
    + c * (1 - 8 * xy * xy) + d * 4 * xy * (x2 - y2)
}

export function rimDistance(rim: ReturnType<typeof cellRim>, x: number, y: number, rr: number) {
  if (!rim || rr === 0 || rr >= CELL_RIM_REACH ** 2) return rr
  const scale = 1 / Math.sqrt(x * x + y * y)
  return rr / rimRadiusSquared(rim, x * scale, y * scale)
}

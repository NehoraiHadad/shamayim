//# allFunctionsCalledOnLoad
import { seeded } from '../../data/landmarks/hash'
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

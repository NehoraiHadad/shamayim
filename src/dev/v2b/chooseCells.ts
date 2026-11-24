import { seeded } from '../../data/landmarks/hash'
import { LAND_STEP } from '../../data/land/grid'
import { HOUSE_M, type GroupCell, type ProtoHouse } from './types'

/** Sub-spots of a cell by how many houses it draws (share of the cell, east / north). */
const SUB: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-.25, .06], [.25, -.06]],
  3: [[-.25, .22], [.25, .18], [0, -.24]],
  4: [[-.25, .24], [.25, .22], [-.23, -.24], [.25, -.22]],
}
const MAX_IN_CELL = 4
/** Seeded shift inside the cell (share of it): neighbours in adjacent cells stand about 0 to half a house apart. */
const JITTER = .14

/**
 * (a) Houses from the cover cells: the count by the radical law over the cells' houses; every outline cell first, then a
 * seeded even spread by what each cell holds.
 */
export function chooseCells(cells: readonly GroupCell[], law: number, lat: number): { houses: ProtoHouse[]; total: number } {
  const total = cells.reduce((sum, c) => sum + c.houses, 0)
  const n = Math.round(total / law)
  const order = new Map(cells.map(c => [c, seeded(c.seed + 3)()]))
  const count = new Map<GroupCell, number>()
  for (const c of cells.filter(c => c.outline).sort((a, b) => order.get(a)! - order.get(b)!).slice(0, n)) count.set(c, 1)
  // The rest by the largest unmet share, ties broken by the seed: an even spread where the cells hold the same.
  for (let left = n - count.size; left > 0; left--) {
    let best: GroupCell | null = null, most = -Infinity
    for (const c of cells) {
      const has = count.get(c) ?? 0
      if (has >= MAX_IN_CELL) continue
      const unmet = c.houses / law - has + .5 * order.get(c)!
      if (unmet > most) { most = unmet; best = c }
    }
    if (!best) break
    count.set(best, (count.get(best) ?? 0) + 1)
  }
  const eastKm = LAND_STEP * 111.32 * Math.cos(lat * Math.PI / 180), northKm = LAND_STEP * 111.32
  const houses: ProtoHouse[] = []
  for (const [c, k] of count) {
    const random = seeded(c.seed + 11)
    SUB[k].forEach(([u, v], i) => houses.push({ seed: c.seed + 101 * i, frontM: HOUSE_M,
      dx: c.dx + (u + (random() - .5) * JITTER) * eastKm, dy: c.dy + (v + (random() - .5) * JITTER) * northKm }))
  }
  return { houses, total }
}

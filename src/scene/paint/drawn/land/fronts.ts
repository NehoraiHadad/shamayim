import { townOfItems } from '../../../model/planeTown'
import type { OutsideItem, TreeDesc } from '../../../model/types'
import { frontTrees, townMarks } from '../../shared/land/townGround'

/*
 * The town's small trees as the town paints its own (`marks.tree`): those in its gardens (the plane prints the gardens)
 * and a few in front of houses, hiding their feet. Drawn after the houses; each in the tier of the house it stands by.
 */

/** A small tree's least width and height (px): a clump that reads. */
const LEAST = 1.4

type Own = Extract<OutsideItem, { kind: 'box' | 'tower' }>

export function townFronts(items: readonly OutsideItem[]): { tree: TreeDesc; tier: number }[] {
  const own = items.filter((i): i is Own => (i.kind === 'box' && !i.beyond) || i.kind === 'tower')
  if (!own.length) return []
  const town = townOfItems(items)
  const tierAt = (x: number, base: number) => {
    let best = own[0], least = Infinity
    for (const o of own) {
      const d = Math.abs(o.x - x) + Math.abs((o.kind === 'box' ? o.foot : o.base) - base)
      if (d < least) { least = d; best = o }
    }
    return best.tier
  }
  const grown = (s: { x: number; base: number; w: number; h: number; seed: number }): TreeDesc =>
    ({ kind: 'tree', x: s.x, base: s.base, w: Math.max(LEAST, s.w), h: Math.max(LEAST, s.h), seed: s.seed })
  return [
    ...townMarks(town).shrubs.map((s) => ({ tree: grown(s), tier: tierAt(s.x, s.base) })),
    ...frontTrees(town).map((s) => ({ tree: grown(s), tier: own[s.at].tier })),
  ]
}

import { townOfItems } from '../../../model/planeTown'
import type { OutsideItem, TreeDesc } from '../../../model/types'
import { frontTrees, townMarks } from '../../shared/land/townGround'
import { REAL_MARKS } from './measure'

/*
 * The small trees that stand before the town's houses, drawn after them so a yard's tree hides a house's foot (the real
 * hand's counterpart of the drawn `land/fronts`): the town's own front trees, and those of its garden trees (which the
 * plane prints on the ground) that stand in front of a house's wall. Each in the tier of the house it stands by. Only where
 * no nearer house stands over the tree (`frontTrees`, and a garden's tree lies in its gap). Geometry only, cached by the
 * item list. Pure.
 */

/** A small tree's least width and height (px): a clump that reads. */
const LEAST = 1.4

type Own = Extract<OutsideItem, { kind: 'box' | 'tower' }>
export interface Front { tree: TreeDesc; tier: number }

const cache = new WeakMap<readonly OutsideItem[], Front[]>()
/** The answers by the layer's form key (its geometry): a new hour gives a new item list of the same bodies. */
const byKey = new Map<string, Front[]>()

/** `key`: the layer's form key, which names the items' geometry. */
export function realFronts(items: readonly OutsideItem[], key?: string): Front[] {
  const cached = cache.get(items) ?? (key === undefined ? undefined : byKey.get(key))
  if (cached) return cached
  const own = items.filter((i): i is Own => (i.kind === 'box' && !i.beyond) || i.kind === 'tower')
  const out: Front[] = []
  if (own.length) {
    const town = townOfItems(items)
    const feet = own.map((o) => o.kind === 'box' ? { x0: o.x - o.w / 2, x1: o.x + o.w / 2, top: o.top, foot: o.foot, tier: o.tier }
      : { x0: o.x - o.w / 2, x1: o.x + o.w / 2, top: o.base - o.h, foot: o.base, tier: o.tier })
    const grown = (s: { x: number; base: number; w: number; h: number; seed: number }): TreeDesc =>
      ({ kind: 'tree', x: s.x, base: s.base, w: Math.max(LEAST, s.w), h: Math.max(LEAST, s.h), seed: s.seed })
    for (const s of townMarks(town, REAL_MARKS).shrubs) {
      const t = grown(s), x0 = t.x - t.w / 2, x1 = t.x + t.w / 2
      // A garden's tree before a wall: its crown over the house's lower wall, its foot at or below the house's.
      const before = feet.find((f) => x1 > f.x0 && x0 < f.x1 && t.base >= f.foot - .05 && t.base - t.h < f.foot)
      if (before) out.push({ tree: t, tier: before.tier })
    }
    for (const s of frontTrees(town, REAL_MARKS)) out.push({ tree: grown(s), tier: feet[s.at]?.tier ?? own[0].tier })
  }
  cache.set(items, out)
  if (key !== undefined) {
    if (byKey.size >= 4) byKey.delete(byKey.keys().next().value!)
    byKey.set(key, out)
  }
  return out
}

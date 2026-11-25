import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { outsideShape } from './outsideShape'
import type { Box, OutsideItem, PlaneTown, Pt, SceneBox } from './types'

/*
 * What the near plane's painters read of the place standing on it (paint only): where its own bodies and trees stand and
 * the top of its own ground over the ridge line, from the outside view's own shape, so the land under a town can be
 * painted as lived in. Nothing is placed or detected here; the shape is the one the town is drawn from.
 */

const q = (v: number) => Math.round(v * 8) / 8

/** The town on the near plane (null for a portrait, or a place with nothing of its own standing). */
export function planeTownOf(world: WorldState, box: SceneBox, clear: readonly Box[]): PlaneTown | null {
  const view = world.place3
  if (view.kind !== 'outside') return null
  const sx = box.width / SCENE_W, land = view.land ? view.land.top.map(([x, y]): Pt => [q(x * sx), q(y)]) : null
  const town = townOfItems(outsideShape(world, box, clear).items, land)
  return town.bodies.length || land ? town : null
}

/** The town of a place's items (its own bodies and towers, its trees; not what stands beyond it), as the plane reads it. */
export function townOfItems(items: readonly OutsideItem[], land: Pt[] | null = null): PlaneTown {
  const bodies: number[] = [], trees: number[] = []
  for (const item of items) {
    if (item.kind === 'box' && !item.beyond) bodies.push(q(item.x), q(item.w), q(item.foot), q(item.top))
    else if (item.kind === 'tower') bodies.push(q(item.x), q(item.w), q(item.base), q(item.base - item.h))
    else if (item.kind === 'tree') trees.push(q(item.tree.x), q(item.tree.base), q(item.tree.w), q(item.tree.h))
  }
  // The key is the data itself, hashed: the plane's ground is kept while it holds, and both hands seed from it.
  let h = 2166136261
  for (const v of [...bodies, -1, ...trees]) h = Math.imul(h ^ Math.round(v * 8), 16777619)
  const marks = h >>> 0
  for (const v of [-2, ...(land?.flat() ?? [])]) h = Math.imul(h ^ Math.round(v * 8), 16777619)
  return { bodies, trees, land, key: `${marks.toString(36)}.${(h >>> 0).toString(36)}` }
}

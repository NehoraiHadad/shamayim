import type { OutsideView, Pt } from '../../world/types'
import type { ProtoFrame } from './frame'
import type { GroupCell, Spot } from './types'

/** Column step and the tone's margin round the feet (px). */
const STEP = 3, OVER = 1.2, UNDER = 1.6, SIDE = 5

/**
 * The trodden ground under the built cells, as the existing painter's one own-ground polygon (`view.land`: one top and one
 * base line over x): from the farthest built cell's foot to the nearest one's in each column, closing to a point at the ends.
 */
export function troddenGround(cells: readonly GroupCell[], proto: ProtoFrame, km: number): OutsideView['land'] {
  const spots = cells.map(c => ({ c, ...proto.at(c) }))
  const left = Math.min(...spots.map(p => p.x)) - SIDE, right = Math.max(...spots.map(p => p.x)) + SIDE
  const columns: { x: number; top: number; base: number; at: Spot }[] = []
  for (let x = left; x <= right + .01; x += STEP) {
    const here = spots.filter(p => Math.abs(p.x - x) <= SIDE)
    const nearest = spots.reduce((a, b) => Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a)
    const feet = here.length ? here.map(p => p.foot) : [nearest.foot]
    columns.push({ x, top: Math.max(proto.top(x), Math.min(...feet) - OVER), base: Math.max(...feet) + UNDER, at: nearest.c })
  }
  const soft = (pick: (c: (typeof columns)[number]) => number) => columns.map((_, i) => {
    const part = columns.slice(Math.max(0, i - 2), i + 3)
    return part.reduce((sum, c) => sum + pick(c), 0) / part.length
  })
  const top = soft(c => c.top), base = soft(c => c.base)
  const ease = (i: number) => Math.min(1, Math.min(i, columns.length - 1 - i) / 3)
  const line = (values: number[], i: number): Pt => {
    const mid = (top[i] + base[i]) / 2
    return [columns[i].x, mid + (values[i] - mid) * ease(i)]
  }
  return { top: columns.map((_, i) => line(top, i)), base: columns.map((_, i) => line(base, i)), km,
    localKm: columns.map((c): Pt => [c.at.dx, c.at.dy]) }
}

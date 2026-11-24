import { LABEL_WIDTHS } from '../heightLabel'
import { beyondArea, fabricArea } from '../labelCoverage'
import { obstacleCoverage, type LabelObstacle } from '../labelObstacleCoverage'
import { VISIBLE_BOTTOM, type Box } from '../layout'
import { SCENE_H, SCENE_W } from '../sceneBox'

const INSET = 2
/** Lowest edge a caption may reach: the sheet lies just under it. */
export const CAPTION_FLOOR = VISIBLE_BOTTOM - INSET

export interface Placed { x: number; y: number; w: number; h: number }
export interface Cover { notes: number; marks: number; fabric: number; beyond: number }

/** Whether a box of fixed size stays on the figure, above the sheet, at every width. */
export const fits = ({ x, y, w, h }: Placed) => y >= INSET && y + h <= CAPTION_FLOOR && LABEL_WIDTHS.every(width => {
  const at = x * width / SCENE_W
  return at - w / 2 >= INSET && at + w / 2 <= width - INSET
})

/** What a caption's box would cover, at the width where it covers most. */
export function coverOf(obstacles: readonly LabelObstacle[]) {
  const scales = LABEL_WIDTHS.map(width => obstacleCoverage({ left: 0, right: width, top: 0, bottom: SCENE_H }, obstacles, width))
  return ({ x, y, w, h }: Placed, pad = 0): Cover => {
    const out = { notes: 0, marks: 0, fabric: 0, beyond: 0 }
    for (const { marks, fabric, protectedZones, scale } of scales) {
      const width = SCENE_W * scale
      const box: Box = { left: Math.max(0, x * scale - w / 2 - pad), right: Math.min(width, x * scale + w / 2 + pad),
        top: Math.max(0, y - pad), bottom: Math.min(SCENE_H, y + h + pad) }
      const area = (r: typeof marks) => r.area(r.left(box.left), r.right(box.right), r.top(box.top), r.bottom(box.bottom))
      const own = area(fabric)
      out.marks = Math.max(out.marks, area(marks))
      out.fabric = Math.max(out.fabric, fabricArea(own))
      out.beyond = Math.max(out.beyond, beyondArea(own))
      out.notes = Math.max(out.notes, protectedZones.reduce((sum, n) => sum
        + Math.max(0, Math.min(box.right, n.right) - Math.max(box.left, n.left))
        * Math.max(0, Math.min(box.bottom, n.bottom) - Math.max(box.top, n.top)), 0))
    }
    return out
  }
}

export interface Scored<T> { at: T; cover: Cover; cost: number }

/** The candidate that hides the least (notes, then marks, then the place's houses), then the cheapest. */
export function least<T>(list: readonly Scored<T>[]): Scored<T> | null {
  return list.reduce<Scored<T> | null>((best, next) => {
    if (!best) return next
    const a = next.cover, b = best.cover
    return (a.notes - b.notes || a.marks - b.marks || a.fabric - b.fabric || next.cost - best.cost) < 0 ? next : best
  }, null)
}

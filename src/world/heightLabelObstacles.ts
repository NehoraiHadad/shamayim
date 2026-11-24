import type { Point } from './layout'
import type { LabelObstacle } from './heightLabel'
import { SCENE_W } from './sceneBox'
import type { OutsideView } from './types'

/** Use the envelope of both painters' own portrait, excluding cast shadows. */
export function portraitLabelObstacles(view: Pick<OutsideView, 'skyline' | 'trees'>, dot: Point, width: number): LabelObstacle[] {
  const sx = width / SCENE_W
  const boxes = view.skyline.boxes
  const left = boxes.reduce((edge, b) => Math.min(edge, (b.x - b.w / 2) * sx), dot.x)
  const right = boxes.reduce((edge, b) => Math.max(edge, (b.x + b.w / 2) * sx), dot.x)
  return [
    ...boxes.map((b) => {
      const x = b.x * sx
      const half = b.w * sx / 2
      const side = x < dot.x ? dot.x - left : right - dot.x
      // Three priority levels: trees, walls at the edge, and walls at the dot.
      const centrality = side > 0 ? Math.max(0, 1 - Math.abs(x - dot.x) / side) : 1
      // Drawn townRoof rises 2.8 px and extends .4 px. Round out for the .1 px ridge detail.
      return { left: x - half - .5, right: x + half + .5, top: b.top - 3, bottom: b.foot, weight: 2 + centrality }
    }),
    ...view.skyline.towers.map((t) => ({
      // Allow the crown detail above the tower body, as in outsideShape's paint bounds.
      left: t.x * sx - t.w / 2, right: t.x * sx + t.w / 2, top: t.baseY - t.h - 4, bottom: t.baseY, weight: 3,
    })),
    ...view.trees.map((t) => ({
      // The canopy's full radius and the extra pixel above it in outsideShape's paint bounds.
      left: t.x * sx - t.w, right: t.x * sx + t.w, top: t.base - t.h - 1, bottom: t.base,
    })),
  ]
}

import type { LabelObstacle } from './heightLabel'
import { BUILDING_EAVE, BUILDING_ROOF, TOWER_CROWN, TREE_CROWN } from './portraitMargins'
import type { OutsideView } from './types'

/** Envelope of the two painters, excluding cast shadows. */
export function portraitLabelObstacles(view: Pick<OutsideView, 'skyline' | 'trees'>): LabelObstacle[] {
  return [
    ...view.skyline.boxes.map(b => ({ left: b.x - b.w / 2, right: b.x + b.w / 2,
      overhang: BUILDING_EAVE, top: b.top - BUILDING_ROOF, bottom: b.foot })),
    ...view.skyline.towers.map(t => ({ left: t.x - t.w / 2, right: t.x + t.w / 2,
      top: t.baseY - t.h - TOWER_CROWN, bottom: t.baseY, fixed: 'center' as const })),
    ...view.trees.map(t => ({ left: t.x - t.w, right: t.x + t.w, top: t.base - t.h - TREE_CROWN,
      bottom: t.base, fixed: 'center' as const })),
  ]
}

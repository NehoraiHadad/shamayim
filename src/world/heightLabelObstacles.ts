import type { LabelObstacle } from './heightLabel'
import { BUILDING_EAVE, BUILDING_ROOF, TOWER_CROWN, TOWER_PODIUM_OVERHANG, TREE_CROWN, towerMastHeight } from './portraitMargins'
import type { BeyondTower, OutsideView } from './types'

function tower(t: Pick<BeyondTower, 'x' | 'baseY' | 'w' | 'h' | 'crown' | 'lod'>): LabelObstacle {
  const crown = t.crown === 2 ? Math.max(TOWER_CROWN, towerMastHeight(t.h)) : TOWER_CROWN
  return { left: t.x - t.w / 2, right: t.x + t.w / 2, top: t.baseY - t.h - crown, bottom: t.baseY,
    fixed: 'center', overhang: t.lod === 'glyph' ? TOWER_PODIUM_OVERHANG : undefined }
}

/** Silhouette envelope of the two painters, excluding shadows and edge shading. */
export function portraitLabelObstacles(view: Pick<OutsideView, 'skyline' | 'trees' | 'beyond' | 'beyondTowns'>): LabelObstacle[] {
  return [
    ...view.skyline.boxes.map(b => ({ left: b.x - b.w / 2, right: b.x + b.w / 2,
      overhang: BUILDING_EAVE, top: b.top - BUILDING_ROOF, bottom: b.foot })),
    ...view.skyline.towers.map(tower),
    ...view.trees.map(t => ({ left: t.x - t.w, right: t.x + t.w, top: t.base - t.h - TREE_CROWN,
      bottom: t.base, fixed: 'center' as const })),
    ...view.beyond.map(t => ({ ...tower(t), priority: 'beyond' as const })),
    ...(view.beyondTowns ?? []).map(b => ({ left: b.x - b.w / 2, right: b.x + b.w / 2,
      top: b.baseY - b.h, bottom: b.baseY, priority: 'beyond' as const })),
  ]
}

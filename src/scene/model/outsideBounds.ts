import { TOWER_CROWN, TREE_CROWN, WATER_ROOF_CLEARANCE } from '../../world/portraitMargins'
import type { OutsideItem } from './types'

export function outsideBounds(items: OutsideItem[]) {
  // The layer's box: everything with the longest cast shadow either side, independent of the light (a scrub never resizes it).
  const reach = (left: number, top: number, right: number, bottom: number, height: number) => {
    const cast = Math.min(14, 2.5 * height * .6 + 1)
    return { left: left - cast - 2, top: top - 4, right: right + cast + 2, bottom: bottom + 2 }
  }
  const boxes = items.map((item) => item.kind === 'box' ? reach(item.x - item.w / 2, item.top - WATER_ROOF_CLEARANCE, item.x + item.w / 2, item.foot, item.foot - item.top)
    : item.kind === 'tree' ? reach(item.tree.x - item.tree.w, item.tree.base - item.tree.h - TREE_CROWN, item.tree.x + item.tree.w, item.tree.base, 0)
    : item.kind === 'tower' ? reach(item.x - item.w / 2, item.base - item.h - TOWER_CROWN, item.x + item.w / 2, item.base, item.h)
      : reach(item.glyph.x - item.glyph.w / 2, item.glyph.base - item.glyph.h * item.glyph.scale, item.glyph.x + item.glyph.w / 2,
        item.glyph.base, item.glyph.h * item.glyph.scale))
  if (!boxes.length) return
  return { left: Math.min(...boxes.map(b => b.left)), right: Math.max(...boxes.map(b => b.right)),
    top: Math.min(...boxes.map(b => b.top)), bottom: Math.max(...boxes.map(b => b.bottom)) }
}

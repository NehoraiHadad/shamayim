import { STOREY_M } from '../../data/city/skylineHeight'
import { receiverId } from './buildingMaterial'
import type { OutsideItem } from './types'

/** A full tower or spire, with glyph widths in CSS pixels. */
export function towerItem(t: { x: number; baseY: number; w: number; h: number; heightM: number; seed: number; crown: 0 | 1 | 2;
  lod: string; famous: boolean; industrial?: true }, sx: number, tier: number): OutsideItem {
  return { kind: 'tower', x: t.x * sx, base: t.baseY, w: t.w, h: t.h, tier, seed: t.seed, crown: t.crown,
    receiver: receiverId(t.seed, t.lod === 'glyph', t.industrial),
    ...(t.industrial ? { industrial: true as const } : {}),
    full: t.lod === 'glyph', famous: t.famous, storeys: Math.max(1, Math.round(t.heightM / STOREY_M)) }
}

export function boundsOf(items: OutsideItem[]) {
  // The layer's box includes the longest cast shadow either side, independent of the light.
  const reach = (left: number, top: number, right: number, bottom: number, height: number) => {
    const cast = Math.min(14, 2.5 * height * .6 + 1)
    return { left: left - cast - 2, top: top - 4, right: right + cast + 2, bottom: bottom + 2 }
  }
  const boxes = items.map((item) => item.kind === 'box' ? reach(item.x - item.w / 2, item.top - 2.5, item.x + item.w / 2, item.foot, item.foot - item.top)
    : item.kind === 'tree' ? reach(item.tree.x - item.tree.w, item.tree.base - item.tree.h - 1, item.tree.x + item.tree.w, item.tree.base, 0)
      : item.kind === 'tower' ? reach(item.x - item.w / 2, item.base - item.h - 4, item.x + item.w / 2, item.base, item.h)
        : reach(item.glyph.x - item.glyph.w / 2, item.glyph.base - item.glyph.h * item.glyph.scale, item.glyph.x + item.glyph.w / 2,
          item.glyph.base, item.glyph.h * item.glyph.scale))
  if (!boxes.length) return
  return { left: Math.min(...boxes.map(b => b.left)), right: Math.max(...boxes.map(b => b.right)),
    top: Math.min(...boxes.map(b => b.top)), bottom: Math.max(...boxes.map(b => b.bottom)) }
}

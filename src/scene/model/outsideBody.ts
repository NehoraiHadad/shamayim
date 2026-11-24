import { HOUSE_TOP_M, type OutsideBox } from '../../data/city/outsideView'
import { STOREY_M } from '../../data/city/skylineHeight'
import { hashId, seeded } from '../../data/landmarks/hash'
import { roofM } from '../../world/outsideBodies'
import type { OutsideView } from '../../world/types'
import { COLLECTORS_TO_M, receiverId } from './buildingMaterial'
import type { OutsideItem } from './types'

/** A house or a block of the place, as it stands clear (`x` and `w`, land px). */
export function bodyItem(box: OutsideBox, x: number, w: number, tier: number, roofs: OutsideView['roofs']): Extract<OutsideItem, { kind: 'box' }> {
  const heightM = roofM(box), seed = box.seed ?? hashId(`${box.x.toFixed(2)}:${box.foot.toFixed(2)}`)
  // The data's continuum: a low roof is a house (its roof by the evidence, mixed half and half), a higher one a block.
  const looks = seed + 7, r = seeded(looks)
  const roof = heightM >= HOUSE_TOP_M ? null : roofs === 'mixed' ? (r() < .5 ? 'tile' : 'flat') : roofs
  return { kind: 'box', x, w, top: box.top, foot: box.foot, tier,
    // A block's roof is its seed's first draw, so its plaster is drawn with its looks: the tall are no paler than the low.
    seed, receiver: receiverId(seed, false, false, roof ? seed : looks, !roof && heightM <= COLLECTORS_TO_M),
    storeys: Math.max(1, Math.round((heightM - 1) / STOREY_M)), folded: (box.heightM ?? 0) > 60, roof,
    heater: roof === 'flat' && r() < .45 }
}

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

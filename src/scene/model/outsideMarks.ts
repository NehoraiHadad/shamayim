import { hashId } from '../../data/landmarks/hash'
import { groundFn } from '../../data/landmarks/seat'
import type { WorldMark } from '../../world/markGeometry'
import { finalSeats, visibleOutsideMark, type TownBlockSpan } from '../../world/outsideSeats'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { glyphHand } from './glyphHand'
import type { Box, GlyphDesc, OutsideItem, Tones } from './types'

/** The outside layer sorts marks just in front of other items at the same base. This is a sort offset in px, with no draw offset. */
const MARK_DEPTH_OFFSET_PX = .01

/** Final near marks in screen px, ready to sort into the outside layer at their base depth. */
export function outsideMarks(world: WorldState, width: number, drawnBlocks: ReadonlyMap<string, TownBlockSpan>,
  clear: readonly Box[], behind: (x: number, y: number) => number) {
  const sx = width / SCENE_W
  const ordinary = world.marks.flatMap((mark) => {
    if (mark.plane !== 'near' || mark.seatBlockId !== undefined) return []
    return visibleOutsideMark(mark, mark.x * sx, clear)
  })
  return [...ordinary, ...finalSeats(world, width, drawnBlocks, clear)].map(({ mark, x }): { y: number; item: OutsideItem; km: number } => {
    const seed = hashId(mark.id)
    const glyph: GlyphDesc = { kind: mark.glyphKind, x, base: mark.base, h: mark.h, scale: mark.scale, w: mark.w, seed,
      hand: glyphHand(mark.glyphKind, seed), tones: undefined as unknown as Tones, famous: mark.named,
      ...(mark.depth !== undefined ? { ground: groundUnder(world, mark) } : {}) }
    return { y: mark.base + MARK_DEPTH_OFFSET_PX, item: { kind: 'mark', glyph }, km: Math.min(mark.km, behind(mark.x, mark.base)) }
  })
}

/** A field's ground under it (relative to its base), every glyph px across, as the portrait's fields take it. */
function groundUnder(world: WorldState, m: WorldMark): number[] {
  const g = groundFn(world.terrain.near.points.map(([x, y]) => [x, y]), SCENE_W)
  const n = Math.max(2, Math.round(m.w))
  return Array.from({ length: n + 1 }, (_, i) => g(m.x - m.w / 2 + i * m.w / n) + m.depth! - m.base)
}

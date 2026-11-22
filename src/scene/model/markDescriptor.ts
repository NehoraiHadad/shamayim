import { hashId } from '../../data/landmarks/hash'
import { groundFn } from '../../data/landmarks/seat'
import type { WorldMark } from '../../world/markGeometry'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { glyphHand } from './glyphHand'
import type { GlyphDesc, Tones } from './types'

const grounds = new WeakMap<object, (x: number) => number>()
function groundUnder(world: WorldState, mark: WorldMark) {
  if (mark.depth === undefined) return undefined
  let ground = grounds.get(world.terrain)
  if (!ground) grounds.set(world.terrain, ground = groundFn(world.terrain.near.points.map(([x, y]): [number,
     number] => [x, y]), SCENE_W))
  const n = Math.max(2, Math.round(mark.w))
  return Array.from({ length: n + 1 }, (_, i) =>
    ground!(mark.x - mark.w / 2 + i * mark.w / n) + mark.depth! - mark.base)
}

/** One descriptor path for owned and non-owned glyphs, on both receiving layers. */
export function markDescriptor(world: WorldState, mark: WorldMark, x: number, tones: Tones,
  hazeKm: number, supportId?: string, town?: boolean): GlyphDesc {
  const seed = hashId(mark.id), ground = groundUnder(world, mark)
  return { kind: mark.glyphKind, sourceId: mark.id, x, base: mark.base, h: mark.h, scale: mark.scale, w: mark.w,
    seed, hand: glyphHand(mark.glyphKind, seed), tones, famous: mark.named, factor: mark.factor ?? 1,
    trueHeightPx: mark.trueHeightPx ?? mark.h * mark.scale, trueDistanceKm: mark.km, hazeKm, supportId, town,
    baseMode: mark.baseMode ?? 'foot', ridgeKind: mark.ridgeKind, bearingX: mark.bearingX,
    sourceTopY: mark.sourceTopY, sourceGroundY: mark.sourceGroundY,
    ...(ground ? { ground } : {}) }
}

/** Far placements can change when the painted town/occluders change, even if the source IDs stay the same. */
export const glyphGeometryKey = (glyph: GlyphDesc) =>
  [glyph.seed, glyph.hand, glyph.x, glyph.base, glyph.h, glyph.scale, glyph.w, glyph.factor]

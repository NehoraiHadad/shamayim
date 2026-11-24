import { offsetKm } from '../../data/landmarks/project'
import type { WorldMark } from '../../world/markGeometry'
import type { WorldInput, WorldState } from '../../world/types'
import type { ProtoFrame } from './frame'

/** Real heights (m) where the mark carries none: what a landmark's size is held to. */
const TRUE_M: Partial<Record<string, number>> = { synagogue: 9, orchard: 5, vineyard: 2.5, solar: 2.5, waterTower: 25, silo: 18, church: 14, palms: 12 }
/** At most this many times its true ratio to a house; and how far outside the group a landmark is still its own (km). */
const RATIO = 2, OUTSIDE_KM = .15

/** The place's own landmarks at their true place, no push off the dot, held to the ratio; no minarets; the rest as today. */
export function protoMarks(world: WorldState, input: WorldInput, proto: ProtoFrame): WorldMark[] {
  const { frame, ppm, enlarge } = proto
  return world.marks.flatMap((mark): WorldMark[] => {
    if (mark.kind === 'minaret') return []
    if (mark.plane !== 'near' || mark.sightKm !== undefined || mark.seatBlockId !== undefined) return [mark]
    const source = input.landmarks.find(l => l.id === mark.id)
    if (!source) return [mark]
    const { dx, dy } = offsetKm(input.place, source)
    if (dx < frame.w - OUTSIDE_KM || dx > frame.e + OUTSIDE_KM || dy < frame.s - OUTSIDE_KM || dy > frame.n + OUTSIDE_KM) return []
    const at = proto.at({ dx, dy })
    const drawn = mark.h * mark.scale
    const most = RATIO * (TRUE_M[mark.kind] ?? (source.heightM || 8)) * ppm * enlarge * at.scale
    const k = Math.min(1, most / drawn)
    const depth = mark.depth === undefined ? {} : { depth: mark.depth + at.foot - mark.base }
    return [{ ...mark, x: at.x, base: at.foot, baseY: at.foot, scale: mark.scale * k, w: mark.w * k, ...depth }]
  })
}

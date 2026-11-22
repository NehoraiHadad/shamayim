import type { WorldMark } from '../../world/markGeometry'
import { markBoxAt } from '../../world/markGeometry'
import type { WorldState } from '../../world/types'
import { footSpans, type DrawnMass } from './markOcclusion'
import { TOWN_SIDE_PX } from './neighbourPlacement'
import type { Box } from './types'

/** Exact centre-position boundaries: painted foot spans, text rectangles and viewport edges, all in CSS px. */
export function neighbourClearance(world: WorldState, width: number, mark: WorldMark, zones: readonly Box[], masses:
   DrawnMass[],
  options: { layer?: 'outside' | 'far'; supportId?: string; town?: boolean; skipRidge?: 'near' | 'land' } = {}) {
  const side = options.town === false ? 0 : TOWN_SIDE_PX
  // Ridge icons have no town seam: every other foreground terrain line must clear the actual foot.
  const seated = !options.skipRidge && (mark.seatBlockId !== undefined || Boolean(options.supportId))
  const spans = footSpans(world, width, masses, mark.base, mark.km,
    seated, options.layer, options.supportId, options.skipRidge)
  const half = mark.w / 2, padded = half + side
  const body = markBoxAt(mark, 0)
  const text = zones.filter(zone => zone.y < body.bottom && zone.y + zone.h > body.top)
  const boundaries = [padded, width - padded, ...spans.flatMap(span => [span.left - padded, span.right + padded]),
    ...text.flatMap(zone => [zone.x - half, zone.x + zone.w + half])]
  return { boundaries, visible: (bounds: typeof body) => bounds.left >= 0 && bounds.right <= width
    && !spans.some(span => span.left < bounds.right && span.right > bounds.left)
    && !text.some(zone => zone.x < bounds.right - side && zone.x + zone.w > bounds.left + side) }
}

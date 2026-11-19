import type { Place } from '../../config/place'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import type { SceneTerrain } from '../terrain/terrain'
import { bearingOf, markHeight, offsetKm, projectSight, toX } from './project'
import type { Landmark } from './types'

/** In panorama mode rank depth relative to the ridge in the direction of the mark. */
export function projectMark(place: Place, mark: Landmark, terrain: SceneTerrain) {
  if (terrain.sightAt && terrain.stage) {
    // A turning view: the place's own homes stand on the stage, in the middle; everything else by its true bearing.
    if (mark.kind === 'homes') return { x: RIDGE_WIDTH / 2, layer: 'near' as const, offset: { dx: 0, dy: 0 } }
  }
  if (terrain.sightAt) {
    // A curated village glyph (Shadmot's homes) keeps its spot by the dot, as does one behind the viewer (its palms).
    if (!terrain.stage && mark.x != null && (mark.kind === 'homes' || !bearingOf(place, mark, terrain.camera))) return { x: mark.x, layer: 'near' as const, offset: { dx: 0, dy: 0 } }
    const sight = projectSight(place, mark, terrain.sightAt, terrain.camera)
    if (!sight) return null
    if (sight.layer === 'plain') {
      const hPx = Math.round(markHeight(mark.heightM, 'far') * Math.min(1, (30 / sight.km) ** 2))
      const ground = terrain.seenAt?.(sight.x, sight.km)
      return { x: sight.x, layer: sight.layer, offset: { dx: sight.km, dy: 0 },
        plain: { baseY: sight.groundY, hPx, visibleTopY: ground ? undefined : sight.y } }
    }
    return { x: sight.x, layer: sight.layer, offset: { dx: sight.km, dy: Math.max(-3, Math.min(3, sight.behindKm)) } }
  }
  const offset = offsetKm(place, mark)
  const projected = mark.x == null ? toX(offset.dx) : { x: mark.x, layer: 'near' as const }
  return projected && { ...projected, offset }
}

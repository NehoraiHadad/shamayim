import type { Place } from '../../config/place'
import { screenSide } from '../../domain/camera'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import type { SceneTerrain } from '../terrain/terrain'
import { isLandmark } from './fame'
import { PORTRAIT_MARGIN_KM } from './portrait'
import { markHeight, offsetKm, projectSight, toX } from './project'
import type { Landmark, MarkKind } from './types'

/** The place's portrait: how far it reaches (`portrait.ts`); absent for a city, which is drawn true. */
export interface Portrait {
  reachKm: number
  /** Half the drawn village (scene px): the portrait's other elements stand outside it. */
  innerPx?: number
}

/** What a portrait can show of its place: what stands in it or grows round it (not masts, not a city's towers). */
export const PORTRAIT_KINDS = new Set<MarkKind>(['palms', 'orchard', 'vineyard', 'solar', 'waterTower', 'silo', 'synagogue',
  'church', 'minaret', 'turbine', 'chimney', 'cooling', 'castle', 'lighthouse'])
/** Kinds that stand among the place's own roofs when close (placeMarks' ABSORB). */
const AMONG_ROOFS = new Set<MarkKind>(['synagogue', 'waterTower', 'minaret', 'church', 'silo'])
/** What grows or lies in the fields round the village, a little beyond its houses. */
const FIELDS = new Set<MarkKind>(['palms', 'orchard', 'vineyard', 'solar'])

/**
 * How far a kind belongs to the portrait: the fields reach further out than the village's own reach; buildings only
 * within its built-up area (`reachKm` less its margin); a hall or tower further out is another place's, drawn true.
 */
function portraitKm(kind: MarkKind, reachKm: number) {
  return FIELDS.has(kind) ? reachKm + 1 : AMONG_ROOFS.has(kind) ? Math.max(.6, reachKm - PORTRAIT_MARGIN_KM) : reachKm
}

/**
 * Where a mark of the place stands in its portrait: on its true side of the village (east of it on the scene's east
 * side, west on the west side; north and south do not matter), nearer the dot the nearer it really is. Its distance
 * and size are composed, never its side.
 */
function portraitX(mark: Landmark, dx: number, km: number, reachKm: number, innerPx = 14) {
  const east = screenSide('east') === 'left' ? -1 : 1
  const side = dx >= 0 ? east : -east
  const among = AMONG_ROOFS.has(mark.kind) || isLandmark(mark)
  const from = among ? 4 + Math.max(10, innerPx - 4) * Math.min(1, km / Math.max(.6, reachKm - PORTRAIT_MARGIN_KM))
    : innerPx + 8 + 8 * Math.min(1, km / (reachKm + 1))
  return RIDGE_WIDTH / 2 + side * from
}

/** In panorama mode rank depth relative to the ridge in the direction of the mark. */
export function projectMark(place: Place, mark: Landmark, terrain: SceneTerrain, portrait?: Portrait) {
  if (terrain.sightAt) {
    // The place's famous landmarks (a city's towers among them) are part of its portrait too.
    if (portrait && (PORTRAIT_KINDS.has(mark.kind) || isLandmark(mark))) {
      const { dx, dy } = offsetKm(place, mark)
      const km = Math.hypot(dx, dy)
      // A hall or tower just beyond the village is a neighbour's: not this place's portrait, and next to it on the
      // ridge it reads as a second village. Left out.
      if (AMONG_ROOFS.has(mark.kind) && km > portraitKm(mark.kind, portrait.reachKm) && km <= portrait.reachKm + 1) return null
      if (km <= portraitKm(mark.kind, portrait.reachKm)) {
        // On the village's own line (dy 0): in a portrait, north and south are composed, like distance.
        return { x: portraitX(mark, dx, km, portrait.reachKm, portrait.innerPx), layer: 'near' as const,
          offset: { dx: Math.sign(dx || 1) * km, dy: 0 }, portrait: true }
      }
    }
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
  const projected = toX(offset.dx)
  return projected && { ...projected, offset }
}

import type { Place } from '../../config/place'
import { RIDGE_WIDTH } from '../terrain/ridgeProjection'
import type { SceneTerrain } from '../terrain/terrain'
import { xOf } from '../../domain/camera'
import { POLE, stagePxPerRad } from '../world/stage'
import { EYE_M } from '../terrain/panorama'
import { bearingOf, distanceOf, markHeight, offsetKm, projectSight, toX } from './project'
import type { Landmark } from './types'

/** In panorama mode rank depth relative to the ridge in the direction of the mark. */
export function projectMark(place: Place, mark: Landmark, terrain: SceneTerrain) {
  if (terrain.sightAt && terrain.stage) {
    // A turning view: the place's own homes stand on the stage, in the middle; everything else by its true bearing.
    if (mark.kind === 'homes') return { x: RIDGE_WIDTH / 2, layer: 'near' as const, offset: { dx: 0, dy: 0 } }
    const onGround = groundMark(place, mark, terrain)
    if (onGround !== undefined) return onGround
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

/** Marks nearer than this (km) and in front of the near ridge stand on the ground of a turning view, not on a crest. */
const GROUND_KM = 3

/**
 * A mark close in front of the near ridge, as the pole camera sees it: across by its direction from the pole, on the
 * ground at its true distance (the DEM's height there), as tall as it looks from there. Undefined when it is not such
 * a mark (it then stands on the ridge or the plain as before); null when it is behind the pole or out of view.
 */
function groundMark(place: Place, mark: Landmark, terrain: SceneTerrain) {
  const { camera, horizonY, sightAt } = terrain
  if (!camera || horizonY === undefined || !sightAt) return undefined
  const km = distanceOf(place, mark)
  if (km > GROUND_KM) return undefined
  const fromPlace = bearingOf(place, mark, camera)
  if (fromPlace && km > sightAt(fromPlace.x).nearKm - .3) return undefined
  const { dx, dy } = offsetKm(place, mark)
  const heading = (camera.heading * Math.PI) / 180
  const e = dx * 1000 + POLE.backM * Math.sin(heading), n = dy * 1000 + POLE.backM * Math.cos(heading)
  const d = Math.hypot(e, n)
  if (e * Math.sin(heading) + n * Math.cos(heading) < 40) return null
  const x = xOf((Math.atan2(e, n) * 180) / Math.PI, camera)
  if (x < 0 || x > camera.width) return null
  const pxPerRad = stagePxPerRad(camera.pxPerDeg)
  // The ground there, relative to the pole's eye (the DEM within the stage is taken as the place's own level).
  const ground = (fromPlace && km >= .4 ? terrain.groundAt?.(fromPlace.x, km) ?? 0 : 0) - (POLE.upM - EYE_M)
  const baseY = horizonY - pxPerRad * Math.atan2(ground, d)
  const hPx = Math.max(3, Math.min(24, Math.round(pxPerRad * Math.atan2(mark.heightM, d))))
  return { x, layer: 'plain' as const, offset: { dx: km, dy: 0 }, plain: { baseY, hPx, visibleTopY: undefined, front: true } }
}

import { squareOf, squareKey } from '../data/city/grid'
import type { CityResult } from '../data/city/types'
import { farCellId } from '../data/city/townFootprints'
import type { OutsideFrame } from '../data/city/outsideView'
import { bearingOf, distanceOf, offsetKm, type Coordinate } from '../data/landmarks/project'
import type { Landmark, MarkPerspective } from '../data/landmarks/types'
import { viableNeighbour } from './neighbourPolicy'
import { visibleMarkHeight } from './visibleMarkHeight'
import { localTownAt } from './markContext'
import { SCENE_W } from './sceneBox'
import { beyondKm, outsideDistance, overTheCrest } from './beyondSeat'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { WorldMark } from './markGeometry'
import { glyphAtHeight } from './glyphSpecs'

/** Outside marks share the town's depth/haze frame. Far-layer marks retain the panorama eye. */
export function markPerspective(place: Coordinate, terrain: SceneTerrain, frame: OutsideFrame,
  baseKm: number, city?: CityResult | null): MarkPerspective {
  return (mark: Landmark, layer, base) => {
    const { dx, dy } = offsetKm(place, mark)
    const sightKm = layer === 'near' ? outsideDistance(frame.eyeN, dx, dy) : distanceOf(place, mark)
    const km = layer === 'near' ? beyondKm(frame, baseKm, dx, dy) : sightKm
    const crestPx = overTheCrest(terrain, dx, dy, mark.heightM)
    const bearing = bearingOf(place, mark, terrain.camera)
    const ground = bearing && terrain.seenAt?.(bearing.x, bearing.km)
    const top = bearing && terrain.seenAt?.(bearing.x, bearing.km, mark.heightM)
    return { sightKm, km, supportBlockId: squareKey(squareOf(mark.lat, mark.lon)), heightM: mark.heightM,
      hPx: visibleMarkHeight(mark.heightM, sightKm, base, terrain.horizonY, crestPx),
      townFootprint: localTownAt(city, mark), farCellId: farCellId(mark), crestPx,
      ...(bearing ? { bearingX: bearing.x } : {}),
      ...(top ? { sourceTopY: top.y, sourceGroundY: top.groundY }
        : ground ? { sourceGroundY: ground.groundY } : {}) }
  }
}

/** Placement can move a base out of a label, so evaluate its final elevation before drawing. */
export function angularMark<T extends WorldMark>(mark: T, horizonY: number): T | null {
  if (mark.sightKm === undefined || mark.heightM === undefined) return mark
  const hPx = visibleMarkHeight(mark.heightM, mark.sightKm, mark.base, horizonY, mark.crestPx)
  if (!viableNeighbour(mark.glyphKind, mark.named, hPx)) return null
  return { ...mark, ...glyphAtHeight(mark.glyphKind, hPx), hPx }
}

/** Distance (km) of the land along a line of points at px x (the plane's own distances). */
export function kmAlong(terrain: SceneTerrain, x: number, layer: 'near' | 'far', width: number): number {
  const sight = terrain.sightAt?.(x * SCENE_W / width)
  if (!sight) return layer === 'near' ? 1 : 20
  return layer === 'near' ? sight.nearKm : sight.farShows ? sight.farKm : sight.nearKm
}


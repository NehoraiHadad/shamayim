import { visibleMarkHeight } from '../../world/visibleMarkHeight'
import type { WorldMark } from '../../world/markGeometry'
import { neighbourSize } from '../../world/neighbourSize'
import type { WorldState } from '../../world/types'
import { farTownHazeAtTier, farTownTier } from './farTownHaze'

/** Keep the true distance in the receiving layer's frame; enlargement never changes aerial perspective. */
export const neighbourHazeKm = (trueDistanceKm: number) => farTownHazeAtTier(farTownTier(trueDistanceKm))

export function trueNeighbourHeight(world: WorldState, mark: WorldMark, base = mark.base) {
  if (mark.heightM === undefined || mark.sightKm === undefined) return mark.trueHeightPx ?? mark.h * mark.scale
  return visibleMarkHeight(mark.heightM, mark.sightKm, base, world.terrain.horizonY, mark.crestPx)
}

export function displayNeighbour<T extends WorldMark>(world: WorldState, mark: T, base = mark.base) {
  const trueHeightPx = trueNeighbourHeight(world, mark, base)
  const geometry = neighbourSize(mark.glyphKind, trueHeightPx, mark.named)
  return geometry ? { ...mark, ...geometry, hPx: trueHeightPx, base, baseY: base } : null
}

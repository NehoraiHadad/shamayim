import type { WorldMark } from '../../world/markGeometry'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { displayNeighbour, neighbourHazeKm, trueNeighbourHeight } from './neighbourDisplay'
import { neighbourClearance } from './neighbourClearance'
import { placeNeighbour, type HomeRoofline, type NeighbourBlock } from './neighbourPlacement'
import type { DrawnMass } from './markOcclusion'
import type { Box } from './types'

/** A missing town support is different from null: null denotes a source outside mapped town fabric. */
export function evaluateNeighbour<T extends WorldMark>(world: WorldState, mark: T, width: number,
  support: NeighbourBlock | null | undefined, home: HomeRoofline | null, zones: readonly Box[],
  masses: DrawnMass[], layer: 'outside' | 'far' = 'outside') {
  const base = support?.foot ?? (layer === 'far' ? mark.sourceGroundY ?? mark.base : mark.base)
  const trueHeightPx = trueNeighbourHeight(world, mark, base)
  const displayed = displayNeighbour(world, mark, base)
  const factor = displayed?.factor
  const hazeKm = neighbourHazeKm(mark.km)
  const details = { trueHeightPx, factor, hazeKm, supportId: support?.id, town: support !== null }
  if (!displayed) return { ...details, reason: 'exaggeration-cap', placed: null }
  if (support === undefined) return { ...details, reason: 'missing-town-mass', placed: null }
  if (hazeKm < (home?.hazeKm ?? 0)) return { ...details, reason: 'home-haze', placed: null }
  let clearance: ReturnType<typeof neighbourClearance> | undefined
  const get = () => clearance ??= neighbourClearance(world, width, displayed, zones, masses,
    { layer, supportId: support?.id, town: support !== null })
  const placed = placeNeighbour(displayed, mark.x * width / SCENE_W, support, home,
    bounds => get().visible(bounds), () => get().boundaries)
  return { ...details, reason: placed ? 'kept' : 'no-visible-separated-position', placed }
}

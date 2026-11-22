import type { WorldMark } from '../../world/markGeometry'
import { neighbourRule } from '../../world/neighbourPolicy'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { displayNeighbour, neighbourHazeKm, trueNeighbourHeight } from './neighbourDisplay'
import { neighbourClearance } from './neighbourClearance'
import { placeNeighbour, type HomeRoofline, type NeighbourBlock } from './neighbourPlacement'
import { foregroundTerrain } from './landmarkRidge'
import { ridgeNeighbour } from './ridgeNeighbour'
import type { DrawnMass } from './markOcclusion'
import type { Box } from './types'

/** A missing town support is different from null: null denotes a source outside mapped town fabric. */
export function evaluateNeighbour<T extends WorldMark>(world: WorldState, mark: T, width: number,
  support: NeighbourBlock | null | undefined, home: HomeRoofline | null, zones: readonly Box[],
  masses: DrawnMass[], layer: 'outside' | 'far' = 'outside') {
  const rule = neighbourRule(mark.glyphKind, mark.named)
  const base = support?.foot ?? (layer === 'far' && rule !== 'landmark' ? mark.sourceGroundY ?? mark.base : mark.base)
  const trueHeightPx = trueNeighbourHeight(world, mark, base)
  const displayed = displayNeighbour(world, mark, base)
  const factor = displayed?.factor
  const hazeKm = rule === 'landmark' ? mark.km : neighbourHazeKm(mark.km)
  const details = { trueHeightPx, factor, hazeKm, supportId: support?.id, town: support !== null }
  if (rule === 'hidden') return { ...details, reason: 'policy-hidden', placed: null }
  if (hazeKm < (home?.hazeKm ?? 0)) return { ...details, reason: 'home-haze', placed: null }
  let clearance: ReturnType<typeof neighbourClearance> | undefined
  const get = () => clearance ??= neighbourClearance(world, width, displayed!, zones, masses,
    { layer, supportId: support?.id, town: support !== null })
  // A drawn town support proves its outside-frame foot; home-eye projection evidence cannot veto that seat.
  const terrain = rule === 'landmark' && !support ? foregroundTerrain(world, mark, layer) : null
  const hiddenFoot = terrain && mark.sourceGroundY !== undefined && mark.sourceGroundY > terrain.base
  const placed = !hiddenFoot && displayed && placeNeighbour({ ...displayed, baseMode: 'foot' as const },
    mark.x * width / SCENE_W, support, home, bounds => get().visible(bounds), () => get().boundaries)
  if (placed) return { ...details, reason: 'kept', placed }
  // Famous town landmarks still need their own drawn town mass, except on a physically proven terrain ridge.
  const ridge = rule === 'landmark' && ridgeNeighbour(world, mark, width, home, zones, masses, layer)
  if (ridge) return { ...details, ...ridge, reason: 'kept' }
  return { ...details, reason: !displayed ? 'exaggeration-cap' : support === undefined ? 'missing-town-mass'
    : 'no-visible-separated-position', placed: null }
}

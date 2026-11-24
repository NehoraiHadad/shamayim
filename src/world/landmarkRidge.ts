import type { WorldMark } from './markGeometry'
import { outsideRidge } from './outsideDepth'
import { SCENE_W } from './sceneBox'
import { groundAt } from './sceneLight'
import type { WorldState } from './types'

type RidgeWorld = Pick<WorldState, 'camera'> & { terrain: Pick<WorldState['terrain'], 'near'>;
  place3: Exclude<WorldState['place3'], { kind: 'outside' }> |
    Pick<Extract<WorldState['place3'], { kind: 'outside' }>, 'kind' | 'frame' | 'baseKm' | 'land'> }

/** Only actual foreground terrain can supply the exception. */
export function foregroundTerrain(world: RidgeWorld, mark: WorldMark, layer: 'outside' | 'far') {
  const x = mark.bearingX ?? mark.x
  const near = layer === 'outside' ? outsideRidge(world) : world.terrain.near
  const land = world.place3.kind === 'outside' && world.place3.land
  const ridges = [{ kind: 'near' as const, ...near }, ...(land ? [{ kind: 'land' as const,
    points: land.top, distanceKm: land.top.map(() => layer === 'outside' ? land.km : 0) }] : [])]
  const front = ridges.filter(r => r.points.length > 1 && x >= r.points[0][0] && x <= r.points.at(-1)![0])
    .filter(r => groundAt(r.distanceKm.map((km, i) => [r.points[i][0], km]), x) < mark.km)
    .sort((a, b) => groundAt(a.points, x) - groundAt(b.points, x))[0]
  return front ? { ...front, base: groundAt(front.points, x), x } : null
}

export function landmarkRidge(world: RidgeWorld, mark: WorldMark, layer: 'outside' | 'far',
  knownFront?: ReturnType<typeof foregroundTerrain>) {
  // Seated marks have outside-frame feet, without a proven top in that frame. They never use the ridge exception.
  if (mark.seatBlockId !== undefined) return null
  const front = knownFront === undefined ? foregroundTerrain(world, mark, layer) : knownFront
  if (!front || mark.sourceTopY === undefined || mark.sourceGroundY === undefined) return null
  const { base } = front
  if (!(mark.sourceTopY < base && mark.sourceGroundY > base)) return null
  return { ...front, baseAt: (cssX: number, width: number) => groundAt(front.points, cssX * SCENE_W / width) }
}

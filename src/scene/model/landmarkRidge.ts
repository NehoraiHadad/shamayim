import type { WorldMark } from '../../world/markGeometry'
import { outsideRidge } from '../../world/outsideDepth'
import { SCENE_W } from '../../world/sceneBox'
import { groundAt } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'

/** Only actual foreground terrain can supply the exception. Roofs never enter this proof. */
export function foregroundTerrain(world: WorldState, mark: WorldMark, layer: 'outside' | 'far') {
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

export function landmarkRidge(world: WorldState, mark: WorldMark, layer: 'outside' | 'far') {
  const front = foregroundTerrain(world, mark, layer)
  if (!front || mark.sourceTopY === undefined || mark.sourceGroundY === undefined) return null
  const { base, x } = front
  if (!(mark.sourceTopY < base && mark.sourceGroundY > base)) return null
  return { ...front, base, x, baseAt: (cssX: number, width: number) => groundAt(front.points, cssX * SCENE_W / width) }
}

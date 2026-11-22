import type { WorldMark } from '../../world/markGeometry'
import { neighbourSize } from '../../world/neighbourSize'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { landmarkRidge } from './landmarkRidge'
import type { DrawnMass } from './markOcclusion'
import { neighbourClearance } from './neighbourClearance'
import { trueNeighbourHeight } from './neighbourDisplay'
import { placeNeighbour, type HomeRoofline } from './neighbourPlacement'
import type { Box } from './types'

export function ridgeNeighbour<T extends WorldMark>(world: WorldState, mark: T, width: number,
  home: HomeRoofline | null, zones: readonly Box[], masses: DrawnMass[], layer: 'outside' | 'far') {
  const ridge = landmarkRidge(world, mark, layer)
  if (!ridge) return null
  const trueHeightPx = Math.min(trueNeighbourHeight(world, mark, ridge.base), ridge.base - mark.sourceTopY!)
  const size = neighbourSize(mark.glyphKind, trueHeightPx, mark.named)
  if (!size) return null
  const displayed = { ...mark, ...size, hPx: trueHeightPx, base: ridge.base, baseY: ridge.base,
    baseMode: 'ridge' as const, ridgeKind: ridge.kind }
  const at = (x: number) => ({ ...displayed, base: ridge.baseAt(x, width), baseY: ridge.baseAt(x, width) })
  const clear = (x: number) => neighbourClearance(world, width, at(x), zones, masses,
    { layer, town: false, skipRidge: ridge.kind })
  const trueX = ridge.x * width / SCENE_W
  // Sliding follows the drawn ridge. Include every linear segment and vertical-occluder crossing as candidates.
  const levels = [...masses.map(m => m.top), ...zones.flatMap(z => [z.y, z.y + z.h + size.h * size.scale])]
  const edges = ridge.points.flatMap(([x, y], i) => {
    const next = ridge.points[i + 1]
    if (!next) return [x * width / SCENE_W]
    return [x * width / SCENE_W, ...levels.filter(v => v > Math.min(y, next[1]) && v < Math.max(y, next[1]))
      .map(v => (x + (next[0] - x) * (v - y) / (next[1] - y)) * width / SCENE_W)]
  })
  const placed = placeNeighbour(displayed, trueX, null, home, bounds => {
    const x = (bounds.left + bounds.right) / 2
    return x >= ridge.points[0][0] * width / SCENE_W && x <= ridge.points.at(-1)![0] * width / SCENE_W
      && clear(x).visible(bounds)
  }, () => [...clear(trueX).boundaries, ...edges], at)
  return placed ? { placed, trueHeightPx, factor: size.factor, supportId: `ridge:${ridge.kind}` } : null
}

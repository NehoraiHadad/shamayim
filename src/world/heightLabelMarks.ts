import { SCENE_CAMERA } from '../domain/camera'
import { NEAR_KM } from '../data/terrain/panorama'
import type { SceneTerrain } from '../data/terrain/terrain'
import { LABEL_WIDTHS, type LabelObstacle } from './heightLabel'
import { foregroundTerrain, landmarkRidge } from './landmarkRidge'
import type { Box } from './layout'
import { requiresTown } from './markContext'
import { markBoxAt, type WorldMark } from './markGeometry'
import { isFamousNonOwn, isNonOwnMark } from './neighbourIdentity'
import { FAR_TOWN_FOOT_TRAVEL_PX, separatedCentres, TOWN_SIDE_PX, type RoofSpan } from './neighbourSeparation'
import { NEIGHBOUR_MIN_TRUE_PX, neighbourSize } from './neighbourSize'
import { SCENE_W } from './sceneBox'
import { groundAt } from './sceneLight'
import type { OutsideView } from './types'
import { neighbourHeight, neighbourHeightRange } from './visibleMarkHeight'

type View = Pick<OutsideView, 'skyline' | 'beyondTowns' | 'frame' | 'baseKm' | 'land'>
type Terrain = Pick<SceneTerrain, 'nearPoints' | 'sightAt' | 'horizonY' | 'camera'>

const visible = (box: Box, notes: readonly Box[], sx: number) => notes.every(n =>
  box.right <= n.left * sx || box.left >= n.left * sx + n.right - n.left || box.bottom <= n.top || box.top >= n.bottom)

function roofSpan(view: View, notes: readonly Box[], sx: number): RoofSpan | null {
  if (!view.skyline.boxes.length && !view.skyline.towers.length) return null
  let left = Infinity, right = -Infinity
  const include = (box: Box) => {
    if (!visible(box, notes, sx)) return
    left = Math.min(left, box.left)
    right = Math.max(right, box.right)
  }
  for (const b of view.skyline.boxes) include({ left: b.x * sx - b.w * sx / 2, right: b.x * sx + b.w * sx / 2,
    top: b.top, bottom: b.foot })
  for (const t of view.skyline.towers) include({ left: t.x * sx - t.w / 2, right: t.x * sx + t.w / 2,
    top: t.baseY - t.h, bottom: t.baseY })
  return left <= right ? { left, right } : null
}

export function heightLabelMarks(marks: readonly WorldMark[], view: View, terrain: Terrain,
  notes: readonly Box[], width: number): LabelObstacle[] {
  const fixed: LabelObstacle[] = marks.filter(mark => !isNonOwnMark(mark)).map(mark => ({
    ...markBoxAt(mark, mark.x * SCENE_W / width), fixed: 'center' as const,
    priority: mark.depth === undefined ? 'mark' as const : undefined,
  }))
  const neighbours = marks.filter(isNonOwnMark)
  if (!neighbours.length) return fixed
  const viewports = LABEL_WIDTHS.map(viewport => ({ viewport, home: roofSpan(view, notes, viewport / SCENE_W) }))
  const blocks = new Map(view.beyondTowns?.map(b => [b.id, b]))
  const ridgeWorld = () => ({
    place3: { ...view, kind: 'outside' as const }, camera: terrain.camera ?? SCENE_CAMERA,
    terrain: { near: { points: terrain.nearPoints, distanceKm: terrain.nearPoints.map(([x]) => terrain.sightAt?.(x).nearKm ?? NEAR_KM) } },
  })
  let world: ReturnType<typeof ridgeWorld> | undefined
  for (const mark of neighbours) {
    const layer = mark.plane === 'near' ? 'outside' : 'far'
    const famous = isFamousNonOwn(mark)
    if (famous && mark.seatBlockId === undefined) world ??= ridgeWorld()
    const front = world && famous && mark.seatBlockId === undefined ? foregroundTerrain(world, mark, layer) : null
    const ridge = world && front && landmarkRidge(world, mark, layer, front)
    const town = requiresTown(mark)
    const block = layer === 'outside' && town !== false ? blocks.get(mark.seatBlockId ?? mark.supportBlockId ?? '') : undefined
    // The far footprint is resolved later in the model. Keep its bounded foot range if it may receive this source.
    const farTown = layer === 'far' && (town ?? mark.farCellId !== undefined)
    const canStand = (farTown || block || !town) &&
      (farTown || block || !front || mark.sourceGroundY === undefined || mark.sourceGroundY <= front.base)
    const base = block?.baseY ?? (layer === 'far' && (!famous || farTown) ? mark.sourceGroundY ?? mark.base : mark.base)
    const travel = farTown ? FAR_TOWN_FOOT_TRAVEL_PX : 0
    const [minHeight, maxHeight] = !canStand ? [0, 0] : travel
      ? neighbourHeightRange(mark, base - travel, base + travel, terrain.horizonY)
      : [0, neighbourHeight(mark, base, terrain.horizonY)]
    const footSize = neighbourSize(mark.glyphKind, maxHeight, mark.named)
    const minFootSize = travel && neighbourSize(mark.glyphKind,
      mark.named ? minHeight : Math.max(NEIGHBOUR_MIN_TRUE_PX, minHeight), mark.named)
    const freeFoot = farTown && town === undefined && famous && mark.base !== base &&
      (!front || mark.sourceGroundY === undefined || mark.sourceGroundY <= front.base) &&
      neighbourSize(mark.glyphKind, neighbourHeight(mark, mark.base, terrain.horizonY), mark.named)
    const ridgeSize = ridge && neighbourSize(mark.glyphKind,
      Math.min(neighbourHeight(mark, ridge.base, terrain.horizonY), ridge.base - mark.sourceTopY!), mark.named)
    for (const { viewport, home } of viewports) {
      const sx = viewport / SCENE_W
      const add = (x: number, size: { w: number; h: number; scale: number }, feet: (lo: number, hi: number) => readonly number[],
        support?: NonNullable<typeof block>, feasibleWidth = size.w) => {
        for (const [left, right] of separatedCentres(x, feasibleWidth, home)) {
          const lo = support ? Math.max(left, (support.x - support.w / 2) * sx + size.w / 2 + TOWN_SIDE_PX) : left
          const hi = support ? Math.min(right, (support.x + support.w / 2) * sx - size.w / 2 - TOWN_SIDE_PX) : right
          if (lo > hi) continue
          const ys = feet(lo, hi)
          if (!ys.length) continue
          fixed.push({ left: lo - size.w / 2, right: hi + size.w / 2, top: Math.min(...ys) - size.h * size.scale,
            bottom: Math.max(...ys), viewport, priority: 'mark', fixed: 'center' })
        }
      }
      if (footSize && (!block || visible({ left: (block.x - block.w / 2) * sx, right: (block.x + block.w / 2) * sx,
        top: block.baseY - block.h, bottom: block.baseY }, notes, sx))) {
        add(mark.x / width * viewport, footSize, () => [base - travel, base + travel], block, minFootSize ? minFootSize.w : footSize.w)
      }
      if (freeFoot) add(mark.x / width * viewport, freeFoot, () => [mark.base])
      if (ridge && ridgeSize) add(ridge.x * sx, ridgeSize, (lo, hi) => {
        // Over the allowed 12 CSS px slide, a piecewise-linear ridge reaches extrema only at the ends or knots.
        const start = Math.max(lo / sx, ridge.points[0][0]), end = Math.min(hi / sx, ridge.points.at(-1)![0])
        return start > end ? [] : [groundAt(ridge.points, start), groundAt(ridge.points, end),
          ...ridge.points.filter(([x]) => x > start && x < end).map(([, y]) => y)]
      })
    }
  }
  return fixed
}

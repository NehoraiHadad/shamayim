import { SCENE_W } from '../../world/sceneBox'
import { groundAt as lineAt } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { planeCrest } from './planeCrest'
import { planeGeomOf } from './planeGeometry'
import { outlineBandY, TEXEL } from './planeBands'
import type { Pt, SceneBox } from './types'

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Reference x and land-pixel y, in front-to-back paint order. */
export function receiverKm(world: WorldState, box: SceneBox) {
  const land = world.place3.kind === 'outside' ? world.place3.land : null
  const near = world.terrain.near.points
  const texels = Math.ceil(box.width / TEXEL)
  const sx = box.width / SCENE_W
  const planes = (['near', 'far', 'back'] as const).flatMap(name => {
    const plane = world.terrain[name]
    if (!plane || plane.points.length < 2 || texels < 1) return []
    const ridge = planeCrest(plane, box.width)
    const bottom = name === 'near' || near.length < 2
      ? [[ridge.at(-1)![0], box.landHeight], [ridge[0][0], box.landHeight]] as Pt[]
      : ridge.map(([x, y]): Pt => [x, Math.min(box.landHeight, Math.max(y, lineAt(near, x / sx) + 3))]).reverse()
    const y = Math.max(0, Math.floor(Math.min(...ridge.map(p => p[1]))) - 1)
    const bands = outlineBandY([...ridge, ...bottom], { x: 0, y, w: box.width, h: box.landHeight - y }, texels)
    const geom = planeGeomOf(world, name, plane, box.landHeight)
    return [{ plane, bottom: bottom.reverse(), bands, geom }]
  })
  return (x: number, footY: number): number => {
    if (land && x >= land.top[0][0] && x <= land.top.at(-1)![0] &&
      footY >= lineAt(land.top, x) && footY <= lineAt(land.base, x)) return land.km
    const plane = planes.find(({ plane, bottom }) => x >= plane.points[0][0] && x <= plane.points.at(-1)![0] &&
      footY >= lineAt(plane.points, x) && footY <= lineAt(bottom, x * sx))
    if (!plane) return Infinity
    const { geom: { cols, rows, km }, bands: { crestY, footY: baseY } } = plane
    const u = clamp01(x / SCENE_W)
    const texel = Math.max(0, Math.min(texels - 1, Math.floor(x * sx / TEXEL)))
    const v = clamp01((footY - crestY[texel]) / Math.max(1, baseY[texel] - crestY[texel]))
    const c = u * (cols - 1), r = v * (rows - 1), c0 = Math.floor(c), r0 = Math.floor(r)
    const c1 = Math.min(cols - 1, c0 + 1), r1 = Math.min(rows - 1, r0 + 1)
    return lerp(lerp(km[r0 * cols + c0], km[r0 * cols + c1], c - c0),
      lerp(km[r1 * cols + c0], km[r1 * cols + c1], c - c0), r - r0)
  }
}

import { outsideProject, type OutsideFrame } from '../../data/city/outsideView'
import { groundFn } from '../../data/landmarks/seat'
import { SCENE_W } from '../../world/sceneBox'
import type { OutsideView, WorldState } from '../../world/types'
import { HOUSE_M, type Spot } from './types'

/** The rows' lowest foot (`VISIBLE_BOTTOM` 114 less the sheet's 6), the eye's stand-back, and half a cover cell (km). */
const FLOOR = 108, BACK = 1.4, HALF_CELL = .025
/** A group this wide (km) takes a third of the width; a 10 km city 0.9 of it; linear between (one rule for every place). */
const SMALL_KM = .6, CITY_KM = 10, SMALL_SHARE = 1 / 3, CITY_SHARE = .9
/** The house is drawn this many times real, and never narrower than the legible px. */
const ENLARGE = 2.2, LEGIBLE_PX = 4
/** Own ground may stand this far over the near line, and always this far under the sky line (px). */
const RISE = 8, UNDER_SKY = 3

export interface ProtoFrame {
  frame: OutsideFrame
  widthPx: number; depthPx: number
  /** Px per metre across at the middle depth, the house's px, how many times real it is. */
  ppm: number; housePx: number; enlarge: number
  /** The radical law's divisor: the root of (drawn house) / (house at the picture's mean scale). */
  law: number
  /** At most this many houses: their silhouettes (a house wide, a house high) cover the group's ellipse at most once. */
  budget: number
  dotY: number
  at: (spot: Spot) => { x: number; foot: number; near: number; scale: number }
  top: (x: number) => number
}

export function protoFrame(world: WorldState, view: OutsideView, spots: readonly Spot[],
  heightNear: (dx: number, dy: number) => number | null): ProtoFrame {
  const xs = spots.map(p => p.dx), ys = spots.map(p => p.dy)
  const w = Math.min(...xs) - HALF_CELL, e = Math.max(...xs) + HALF_CELL
  const s = Math.min(...ys) - HALF_CELL, n = Math.max(...ys) + HALF_CELL
  const wide = e - w, deep = n - s
  const share = SMALL_SHARE + (CITY_SHARE - SMALL_SHARE) * Math.max(0, Math.min(1, (wide - SMALL_KM) / (CITY_KM - SMALL_KM)))
  const widthPx = share * SCENE_W
  const backKm = BACK * Math.max(deep, wide / 2), eyeN = n + backKm, midDepth = backKm + deep / 2
  const ppm = widthPx / (wide * 1000)
  const housePx = Math.max(LEGIBLE_PX, ENLARGE * HOUSE_M * ppm)
  const frame: OutsideFrame = { w, e, s, n, eyeN, backKm, f: widthPx * midDepth / wide, centerX: view.frame.centerX, midDepth, k: ppm }
  const line = (pts?: readonly (readonly [number, number])[]) =>
    pts?.length ? groundFn(pts.map(([x, y]): [number, number] => [x, y]), SCENE_W) : () => Infinity
  const { near, far, back } = world.terrain
  const nearY = line(near.points), farY = line(far.points), backY = line(back?.points)
  const top = (x: number) => {
    const own = nearY(x) + 1.5, sky = Math.min(nearY(x), farY(x), backY(x))
    return Math.min(own, Math.max(sky + UNDER_SKY, own - RISE))
  }
  const scale = view.vscale ?? { s: 0, h0: 0 }
  const lift = (p: Spot) => {
    const h = heightNear(p.dx, p.dy)
    return h === null ? 0 : (scale.h0 - h) * scale.s
  }
  const near0 = outsideProject(frame, 0, 0).near
  const rel = (p: Spot, depth: number) => depth * (outsideProject(frame, p.dx, p.dy).near - near0) + lift(p)
  // The depth is a third of the width where the land has room for it; else the most that stands on the drawn ground.
  let depthPx = widthPx / 3, dotY = view.dot.y
  for (; depthPx > 4; depthPx -= .5) {
    const lo = Math.max(...spots.map(p => top(outsideProject(frame, p.dx, p.dy).x) - rel(p, depthPx)))
    const hi = Math.min(...spots.map(p => FLOOR - rel(p, depthPx)))
    if (lo > hi) continue
    dotY = Math.max(lo, Math.min(hi, view.dot.y))
    break
  }
  const mean = Math.sqrt(ppm * depthPx / (deep * 1000))
  const at = (p: Spot) => {
    const { x, near: nearness, depth } = outsideProject(frame, p.dx, p.dy)
    return { x, foot: Math.max(top(x), Math.min(FLOOR, dotY + rel(p, depthPx))), near: nearness, scale: midDepth / depth }
  }
  return { frame, widthPx, depthPx, ppm, housePx, enlarge: housePx / (HOUSE_M * ppm), law: Math.sqrt(housePx / (HOUSE_M * mean)),
    budget: Math.PI / 4 * widthPx * depthPx / housePx ** 2, dotY, at, top }
}

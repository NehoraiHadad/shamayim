import type { Tones } from '../../model/types'
import { css, mix, outline, type Ctx2D } from '../shared/base/hand'
import { riseOf, type Block } from './townBlocks'
import { block, joint, keyedRun, snap, type Pen } from './townKey'
import type { Planes, TownLight } from './townLight'

/*
 * The drawn town's roofs, as colour blocks: a hipped tile roof seen from the front (its front plane over the front wall,
 * the hip's end over the side the body shows, lit as that side is, a small eave either side, the ridge over the middle),
 * or a flat roof seen as its thin lit slab. Pure.
 */

/** A tile roof's eave past the wall (px); its pitch and ridge are the house's type's (`townBlocks`). */
const EAVE = 0.25
/** A flat roof's slab: against the width and the height, least and most (px). */
const FLAT = 0.14, FLAT_SHARE = 0.16, FLAT_LEAST = 0.5, FLAT_MOST = 1
/** How far a tile roof goes to the shade with no direct light (dusk, an even sky): its red is the sun's. */
const ROOF_DULL = 0.45
/** The least height of a body whose slab takes a joint under it (px): on a smaller one the slab's value step is the join. */
const SLAB_JOINT = 5

export function tileRoof(ctx: Ctx2D, b: Block, x0: number, top: number, w: number, face: { x0: number; x1: number }, t: Tones,
  l: TownLight, p: Planes, pen: Pen) {
  const s = pen.scale, x1 = x0 + w, mid = x0 + w / 2
  const peak = snap(top - riseOf({ w, hip: b.hip }), s), ridge = (w * b.ridge) / 2
  const e0 = x0 - EAVE, e1 = x1 + EAVE, r0 = mid - ridge, r1 = mid + ridge
  const dull = ROOF_DULL * (1 - l.on * (1 - l.night))
  const lit = (k: number) => mix(mix(mix(t.roof, t.shade, 0.4 * (1 - k)), t.roofLit, Math.min(1, 0.2 + 0.8 * k)), t.shade, dull)
  // The roof's front plane faces the sky and the light as the front does; the hip's end takes the side's light.
  const front = lit(Math.min(1, 0.3 * l.top + 0.7 * l.front + 0.2)), hip = mix(lit(0), lit(1), sideShare(p))
  block(ctx, [[e0, top], [e1, top], [r1, peak], [r0, peak]], front)
  // The hip's end: a triangle from the ridge's end down to the eave over the side.
  const corner = p.right ? face.x1 : face.x0
  if (p.right) block(ctx, [[r1, peak], [e1, top], [corner, top]], hip)
  else block(ctx, [[r0, peak], [e0, top], [corner, top]], hip)
  joint(ctx, e0, top, e1 - e0, false, mix(p.joint, t.deep, 0.2), pen)
  keyedRun(ctx, [[x0, top], [e0, top], [r0, peak], [r1, peak], [e1, top], [x1, top]], mix(p.ink, t.roof, 0.15), pen)
  ctx.strokeStyle = css(mix(p.joint, t.roof, 0.2))
  ctx.lineWidth = 1 / s
  ctx.beginPath()
  ctx.moveTo(p.right ? r1 : r0, peak)
  ctx.lineTo(corner, top)
  ctx.stroke()
}

/** Where the side's value stands between the shade and the light: the hip is as lit as the wall under it. */
const sideShare = (p: Planes) => {
  const v = (c: readonly number[]) => c[0] + c[1] + c[2]
  const lo = Math.min(v(p.side), v(p.front)), hi = Math.max(v(p.side), v(p.front))
  return hi > lo ? (v(p.side) - lo) / (hi - lo) : 0.5
}

/** A flat roof's slab on the body, its heater if it has one. Returns the slab's depth. */
export function flatRoof(ctx: Ctx2D, b: Block, x0: number, top: number, w: number, h: number, t: Tones, p: Planes, pen: Pen) {
  const deep = Math.max(1 / pen.scale, snap(Math.max(FLAT_LEAST, Math.min(FLAT_MOST, FLAT * w, FLAT_SHARE * h)), pen.scale))
  ctx.fillStyle = css(p.roof)
  ctx.fillRect(x0, top, w, deep)
  if (h >= SLAB_JOINT) joint(ctx, x0, top + deep, w, false, p.joint, pen)
  if (b.heater && w > 2.6) heater(ctx, b, top, t, p)
  return deep
}

/** A solar heater: its drum and its panel. */
function heater(ctx: Ctx2D, b: Block, top: number, t: Tones, p: Planes) {
  const x = b.x + b.w * (((b.seed >>> 3) % 9) / 9 - 0.5) * 0.5
  ctx.fillStyle = css(p.roof)
  ctx.fillRect(x, top - 0.8, 1.2, 0.6)
  ctx.fillStyle = css(t.panel)
  outline(ctx, [[x - 1.2, top + 0.2], [x - 0.1, top - 0.8], [x - 0.1, top + 0.2]])
  ctx.fill()
}

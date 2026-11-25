import type { RGB, Shine } from '../../model/types'
import { css, type Ctx2D } from '../shared/base/hand'

/*
 * A body's shadow on the ground as the print cuts it: one flat block of the ground's shade ink with a hard knife edge,
 * no wipe and no plinth. It runs from under the body along the ground away from the light, foreshortened as the shared
 * cast is (`shared/town/castShadow`, the real hand's, which this does not change), and its foot follows the ground line
 * under the body, so on a hill it lies along the slope. Pure.
 */

/** The block's depth under the foot (px), how far it starts in under the body (px), the share of its depth left at its tip. */
const DEPTH = 0.7, INSET = 0.3, TIP = 0.35
/** How far the block's top edge tucks up under the foot (px), so no sliver of ground shows between them. */
const TUCK = 0.2
/** The seat's depth under the walls with no cast (px). */
const SEAT = 0.45
/** The longest cast (px) and its reach against the body's height. */
const REACH_MOST = 14, REACH = 0.6

/** Where a body stands: its centre and width, its height, and the ground under its two corners (px). */
export interface Stand { x: number; w: number; h: number; left: number; right: number }

export function castBlock(ctx: Ctx2D, d: Stand, ink: RGB, alpha: number, cast: Shine['cast']) {
  const half = d.w / 2, x0 = d.x - half, x1 = d.x + half
  // The ground line under the body, carried on past it at the same slope.
  const slope = (d.right - d.left) / Math.max(1e-3, d.w), ground = (x: number) => d.left + (x - x0) * slope - TUCK
  const reach = cast.alpha > 0 && cast.dx ? Math.min(REACH_MOST, cast.length * d.h * REACH * Math.min(1, Math.abs(cast.dx) * 1.6)) : 0
  ctx.fillStyle = css(ink, alpha * (reach > 0.5 ? Math.min(1, cast.alpha) : 1))
  ctx.beginPath()
  if (reach <= 0.5) {
    // No cast to speak of: the seat alone, the ground's shade under the walls.
    ctx.moveTo(x0, ground(x0))
    ctx.lineTo(x1, ground(x1))
    ctx.lineTo(x1, ground(x1) + TUCK + SEAT)
    ctx.lineTo(x0, ground(x0) + TUCK + SEAT)
  } else {
    const dir = Math.sign(cast.dx), back = d.x - dir * (half - INSET), tip = d.x + dir * (half + reach)
    const under = dir > 0 ? x0 : x1
    ctx.moveTo(under, ground(under))
    ctx.lineTo(tip, ground(tip))
    ctx.lineTo(tip - dir * Math.min(reach, 1.2), ground(tip) + TUCK + DEPTH * TIP)
    ctx.lineTo(back, ground(back) + TUCK + DEPTH)
    ctx.lineTo(under, ground(under) + TUCK + DEPTH)
  }
  ctx.closePath()
  ctx.fill()
}

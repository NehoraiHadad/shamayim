import type { RGB } from '../../model/types'
import { css, outline, type Ctx2D } from '../shared/base/hand'
import { LINE, type Tier } from './kit/lines'

/*
 * The town's key line: the keyblock's sumi, one ridge of wood round each body. Its weight is set by the body's distance
 * alone (near, far, back: the same steps as the land's crests), cut whole to the device's pixels and laid INSIDE the
 * silhouette, so a small house keeps its size; its ink is the body's own shade face gone toward the deep, never a black
 * pasted over the air. The joins inside a body (its front against its side, a roof against its wall) are one device
 * pixel of a lighter ink.
 */

/** The line's weight at each distance (CSS px): the land's own table, so town and ground are one carving. */
export const KEY = LINE
export type KeyTier = Tier

/** The knife a body is cut with: the device's pixels per scene px and its line's weight there. */
export interface Pen { scale: number; line: number }

/** The pen for a distance on a canvas of this scale: the weight a whole number of device pixels, one at least. */
export const penFor = (tier: KeyTier, scale: number): Pen => ({ scale, line: Math.max(1, Math.round(KEY[tier] * scale)) / scale })

/** A coordinate cut to the device's pixel grid. */
export const snap = (v: number, scale: number) => Math.round(v * scale) / scale

/** Round a standing box, inside it: its sides and its foot, and its top unless a roof takes it. */
export function keyedBox(ctx: Ctx2D, x: number, top: number, w: number, h: number, ink: RGB, pen: Pen, head = true) {
  const k = Math.min(pen.line, w / 3, h / 3)
  ctx.fillStyle = css(ink)
  ctx.fillRect(x, top, k, h)
  ctx.fillRect(x + w - k, top, k, h)
  ctx.fillRect(x, top + h - k, w, k)
  if (head) ctx.fillRect(x, top, w, k)
}

/** A join inside a body: one device pixel of the lighter ink, upright at `x` or level at `y`. */
export function joint(ctx: Ctx2D, x: number, y: number, along: number, upright: boolean, ink: RGB, pen: Pen) {
  const px = 1 / pen.scale
  ctx.fillStyle = css(ink)
  if (upright) ctx.fillRect(x - px / 2, y, px, along)
  else ctx.fillRect(x, y - px / 2, along, px)
}

/** Along an open run of the key (a roof's edges): the pen's weight, flat chisel ends. */
export function keyedRun(ctx: Ctx2D, points: readonly (readonly [number, number])[], ink: RGB, pen: Pen) {
  ctx.strokeStyle = css(ink)
  ctx.lineWidth = pen.line
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'
  ctx.beginPath()
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

/** A closed shape, filled with one colour block. */
export function block(ctx: Ctx2D, points: readonly (readonly [number, number])[], rgb: RGB) {
  ctx.fillStyle = css(rgb)
  outline(ctx, points)
  ctx.fill()
}

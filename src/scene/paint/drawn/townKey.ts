import type { RGB } from '../../model/types'
import { css, outline, type Ctx2D } from '../shared/base/hand'
import { LINE, type Tier } from './kit/lines'
import type { Edges, Run } from './townSilhouette'

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
export function keyedBox(ctx: Ctx2D, x: number, top: number, w: number, h: number, ink: RGB, pen: Pen, head = true, foot = true) {
  const k = Math.min(pen.line, w / 3, h / 3)
  ctx.fillStyle = css(ink)
  ctx.fillRect(x, top, k, h)
  ctx.fillRect(x + w - k, top, k, h)
  if (foot) ctx.fillRect(x, top + h - k, w, k)
  if (head) ctx.fillRect(x, top, w, k)
}

/**
 * Round a standing body by its edges (`townSilhouette`): the key, inside it, where it meets the air or the land; the
 * lighter joint where it stands over a body behind; nothing where one in front carries the join. Its head unless a roof
 * takes it. Returns whether its foot is keyed at each corner, so the ground's line can run on past it.
 */
export function keyedEdges(ctx: Ctx2D, x: number, top: number, w: number, h: number, edges: Edges, ink: RGB, seam: RGB, pen: Pen,
  head = true) {
  const k = Math.min(pen.line, w / 3, h / 3), px = 1 / pen.scale
  const lay = (runs: readonly Run[], lo: number, hi: number, draw: (from: number, to: number, wide: number) => void) => {
    for (const r of runs) {
      const from = Math.max(lo, snap(r.from, pen.scale)), to = Math.min(hi, snap(r.to, pen.scale))
      if (to <= from) continue
      ctx.fillStyle = css(r.key ? ink : seam)
      draw(from, to, r.key ? k : Math.min(k, px))
    }
  }
  lay(edges.left, top, top + h, (a, b, d) => ctx.fillRect(x, a, d, b - a))
  lay(edges.right, top, top + h, (a, b, d) => ctx.fillRect(x + w - d, a, d, b - a))
  if (head) lay(edges.top, x, x + w, (a, b, d) => ctx.fillRect(a, top, b - a, d))
  lay(edges.foot, x, x + w, (a, b, d) => ctx.fillRect(a, top + h - d, b - a, d))
  const end = (runs: readonly Run[], at: number) => runs.some((r) => r.key && r.from <= at + 0.5 && r.to >= at - 0.5)
  return { left: end(edges.foot, x) && end(edges.left, top + h), right: end(edges.foot, x + w) && end(edges.right, top + h) }
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

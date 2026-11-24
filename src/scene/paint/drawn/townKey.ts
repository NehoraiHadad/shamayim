import type { Tones } from '../../model/types'
import { css, outline, type Ctx2D } from '../shared/base/hand'

/* The town's key line: the dark block's line round a body or a roof, thinner on a small one. */

/** The line (px), the width of the body that takes it whole, its strength. */
const WIDE = 0.36, WHOLE_AT = 2.6, STRONG = 0.72

/** Round a standing body. */
export function keyedBox(ctx: Ctx2D, x: number, top: number, w: number, h: number, t: Tones) {
  pen(ctx, w, t)
  ctx.strokeRect(x, top, w, h)
}

/** Round a shape `w` wide. */
export function keyedShape(ctx: Ctx2D, points: readonly (readonly [number, number])[], w: number, t: Tones) {
  pen(ctx, w, t)
  outline(ctx, points)
  ctx.stroke()
}

function pen(ctx: Ctx2D, w: number, t: Tones) {
  ctx.strokeStyle = css(t.deep, STRONG)
  ctx.lineWidth = WIDE * Math.min(1, w / WHOLE_AT)
}

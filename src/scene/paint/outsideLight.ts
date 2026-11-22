import type { RGB, Shine, Tones } from '../model/types'
import { css, type Ctx2D } from './hand'

/** A box's face light and the direct share used for shading. */
export function facesOf(s: Shine) {
  const on = Math.min(1, Math.max(0, (s.direct - 0.04) / 0.41))
  return { ...s.faces, on, glint: s.glint ?? 0 }
}

/**
 * One side face of a box or tower, `w` px of the edge at `x`: turned from the eye, it sees less of the sky than the front
 * (a light shade under an even sky, deeper as the direct light comes and leaves it), and takes the lit tone by its share
 * of the light. The same on both sides, so the lit side turns with the light and never flips.
 */
export function sideFace(ctx: Ctx2D, x: number, top: number, w: number, h: number, k: number, on: number, t: Tones, lit: RGB) {
  ctx.fillStyle = css(t.shade, (0.3 + 0.35 * on) * (1 - k))
  ctx.fillRect(x, top, w, h)
  ctx.fillStyle = css(lit, k)
  ctx.fillRect(x, top, w, h)
}

export const MIN_STOREY_PX = .85

/** Both edges stay in place as each takes its own share of the light. */
export function edgeStrips(ctx: Ctx2D, x: number, y: number, w: number, h: number, strip: number, c: RGB, left: number, right: number) {
  ctx.fillStyle = css(c, left)
  ctx.fillRect(x, y, strip, h)
  ctx.fillStyle = css(c, right)
  ctx.fillRect(x + w - strip, y, strip, h)
}

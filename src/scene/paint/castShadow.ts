import type { Shine, Tones } from '../model/types'
import { css, type Ctx2D } from './hand'

interface CastOutline {
  alpha: number
  inset: number
  edgeY: number
  tipY: number
  bottomY: number
  tipInset(reach: number): number
}

/** Symmetric contact shade and a cast foreshortened by the lateral light, in screen px. */
export function castShadow(ctx: Ctx2D, d: { x: number; base: number; w: number; h: number },
  tones: Tones, cast: Shine['cast'], contact: { alpha: number; height: number }, outline: CastOutline) {
  const half = d.w / 2
  ctx.fillStyle = css(tones.deep, contact.alpha)
  ctx.fillRect(d.x - half - 0.2, d.base - 0.3, d.w + 0.4, contact.height)
  if (cast.alpha <= 0 || !cast.dx) return
  const dir = Math.sign(cast.dx)
  // The shadow's reach across the screen is its run's across part: a light straight ahead or behind casts it toward or
  // away from the eye, foreshortened to a stub (it shrinks to the contact shade, never flips at full length).
  const reach = Math.min(14, cast.length * d.h * 0.6 * Math.min(1, Math.abs(cast.dx) * 1.6))
  if (reach <= 0) return
  const start = half - outline.inset
  const from = d.x + dir * start, to = d.x + dir * (half + reach)
  const g = ctx.createLinearGradient(from, 0, to, 0)
  // Fade the cast through its last screen pixel, leaving only the contact shade.
  g.addColorStop(0, css(tones.shade, outline.alpha * cast.alpha * Math.min(1, reach)))
  g.addColorStop(1, css(tones.shade, 0))
  ctx.beginPath()
  ctx.moveTo(d.x - dir * start, d.base)
  ctx.lineTo(d.x + dir * half, d.base + outline.edgeY)
  ctx.lineTo(to, d.base + outline.tipY)
  ctx.lineTo(to - dir * outline.tipInset(reach), d.base + outline.bottomY)
  ctx.lineTo(d.x - dir * start, d.base + outline.bottomY)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
}

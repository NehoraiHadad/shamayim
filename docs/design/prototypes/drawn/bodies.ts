import type { Disc, LayerOf } from '../../../../src/scene/model/types'
import { paintBodies } from '../../../../src/scene/paint/shared/sky/bodies'
import { css, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import { papered, pigment } from './palette'

/*
 * The sun as bare paper left in the ink: a clean disc, no limb shading, with one thin ring round it where the sky is clear;
 * the moon the shared one (its phase and seas are facts).
 */

const RING = 1.75, AUREOLE = 2.5

export function paintDrawnBodies(ctx: Ctx2D, desc: LayerOf<'bodies'>): void {
  if (desc.sun && desc.part === 'aureole') aureole(ctx, desc.sun)
  else if (desc.sun) disc(ctx, desc.sun)
  if (desc.moon && desc.part !== 'aureole') paintBodies(ctx, { ...desc, sun: null })
}

function aureole(ctx: Ctx2D, d: Disc) {
  const r = d.r * AUREOLE, rgb = pigment(d.halo, 0.5), fade = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r), a = 0.75 * d.aureole * (1 - d.veil)
  fade.addColorStop(0, css(rgb, a))
  fade.addColorStop(0.3, css(rgb, a * 0.8))
  fade.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = fade
  ctx.fillRect(d.x - r, d.y - r, 2 * r, 2 * r)
  ctx.strokeStyle = css(papered(pigment(d.halo, 0.6), 0.8), 0.5 * d.aureole * Math.max(0, 1 - 2 * d.veil))
  ctx.lineWidth = 0.7
  ctx.beginPath()
  ctx.ellipse(d.x, d.y, d.r * RING, d.r * RING * d.flatten, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function disc(ctx: Ctx2D, d: Disc) {
  ctx.fillStyle = css(papered(pigment(d.core, 0.3), 0.5), Math.max(0.1, 1 - 0.97 * d.veil ** 0.7))
  ctx.beginPath()
  ctx.ellipse(d.x, d.y, d.r * 1.04, d.r * 1.04 * d.flatten, 0, 0, Math.PI * 2)
  ctx.fill()
}

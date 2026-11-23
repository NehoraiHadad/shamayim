import type { Disc, LayerOf } from '../../../../src/scene/model/types'
import { paintBodies } from '../../../../src/scene/paint/shared/sky/bodies'
import { css, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import { pigment } from './palette'

/* The sun as a cut disc on stepped rings, no limb shading; the moon the shared one (its phase and seas are facts). */

const RINGS = [2.5, 1.95, 1.45] as const

export function paintDrawnBodies(ctx: Ctx2D, desc: LayerOf<'bodies'>): void {
  if (desc.sun && desc.part === 'aureole') { if (desc.sun.veil < 0.5) rings(ctx, desc.sun) }
  else if (desc.sun) disc(ctx, desc.sun)
  if (desc.moon && desc.part !== 'aureole') paintBodies(ctx, { ...desc, sun: undefined })
}

function rings(ctx: Ctx2D, d: Disc) {
  ctx.fillStyle = css(pigment(d.halo, 0.4), 0.2 * d.aureole * (1 - d.veil))
  for (const k of RINGS) circle(ctx, d.x, d.y, d.r * k, d.flatten)
}

function disc(ctx: Ctx2D, d: Disc) {
  ctx.fillStyle = css(pigment(d.core, 0.5), Math.max(0.1, 1 - 0.97 * d.veil ** 0.7))
  circle(ctx, d.x, d.y, d.r * 1.04, d.flatten)
}

function circle(ctx: Ctx2D, x: number, y: number, r: number, flatten: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * flatten, 0, 0, Math.PI * 2)
  ctx.fill()
}

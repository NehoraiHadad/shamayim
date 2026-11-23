import type { Disc, LayerOf, MoonDisc } from '../../../../src/scene/model/types'
import { paintBodies } from '../../../../src/scene/paint/shared/sky/bodies'
import { css, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import { pigment } from './palette'

/* The sun as a cut disc on stepped rings, no limb shading; the moon the shared one (its phase and seas are facts). */

const RINGS = [2.9, 2.15, 1.5] as const

export function paintDrawnBodies(ctx: Ctx2D, desc: LayerOf<'bodies'>): void {
  if (desc.sun && desc.part === 'aureole') rings(ctx, desc.sun)
  else if (desc.sun) disc(ctx, desc.sun)
  if (desc.moon && desc.part !== 'aureole') moon(ctx, desc, desc.moon)
}

function rings(ctx: Ctx2D, d: Disc) {
  ctx.fillStyle = css(pigment(d.halo, 0.4), 0.2 * d.aureole * (1 - d.veil))
  for (const k of RINGS) circle(ctx, d.x, d.y, d.r * k, d.flatten)
}

function disc(ctx: Ctx2D, d: Disc) {
  ctx.fillStyle = css(pigment(d.core, 0.5), Math.max(0.1, 1 - 0.97 * d.veil ** 0.7))
  circle(ctx, d.x, d.y, d.r * 1.04, d.flatten)
}

function moon(ctx: Ctx2D, desc: LayerOf<'bodies'>, m: MoonDisc) {
  if (m.daylight < 0.5) {
    ctx.fillStyle = css(m.rgb, 0.07 * m.alpha * m.fraction)
    for (const k of [3.6, 2.4]) circle(ctx, m.x, m.y, m.r * k, 1)
  }
  paintBodies(ctx, { ...desc, sun: undefined })
}

function circle(ctx: Ctx2D, x: number, y: number, r: number, flatten: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * flatten, 0, 0, Math.PI * 2)
  ctx.fill()
}

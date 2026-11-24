import type { Arch, Glow, LayerOf } from '../../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'
import { archStops } from './archStops'
import { paintRows } from './skyRows'

/**
 * MEDIUM: the app's own sky, a smooth wash with no marks: the gradient from zenith to horizon, a three-layer glow round
 * the sun (broad warm sky, a nearer brightening, the aureole), the twilight glow where the sun crosses the land, Earth's
 * shadow with the pink belt above it opposite the sun, a cool glow round the moon, and the haze band at the horizon,
 * rising from nothing to its strength at eye level and thinning just below it.
 *
 * Two ways to lay the same wash: `paintSky` on a canvas (the gradient and band row by row, `paintRows`, then the arch and
 * the glows), and `skyBackground` as CSS backgrounds (the app and the harness lay the base as the sky canvas's own
 * background: the browser composites a CSS gradient off the main thread, where a canvas pays per pixel each time the
 * light changes; see the plan's §6, C6).
 */
export function paintSky(ctx: Ctx2D, desc: LayerOf<'sky'>, env: PaintEnv): void {
  paintRows(ctx, desc, env)
  if (desc.arch) paintArch(ctx, desc.arch, desc.bounds, desc.band?.below ?? 0)
  for (const glow of desc.glow) paintGlow(ctx, glow, desc.bounds)
}

function paintGlow(ctx: Ctx2D, g: Glow, bounds: LayerOf<'sky'>['bounds']) {
  const ry = g.ry ?? g.r
  ctx.save()
  ctx.translate(g.x, g.y)
  ctx.scale(1, ry / g.r)
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r)
  fill.addColorStop(0, css(g.rgb, g.alpha))
  fill.addColorStop(1, css(g.rgb, 0))
  ctx.fillStyle = fill
  ctx.fillRect(Math.max(-g.r, bounds.x - g.x), -g.r, Math.min(2 * g.r, bounds.w), 2 * g.r)
  ctx.restore()
}

/** Earth's shadow, up from eye level and the `below` px of sky under it. */
function paintArch(ctx: Ctx2D, a: Arch, bounds: LayerOf<'sky'>['bounds'], below: number) {
  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.scale(1, a.belt / a.rx)
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, a.rx)
  for (const [at, colour] of archStops(a)) fill.addColorStop(at, colour)
  ctx.fillStyle = fill
  ctx.fillRect(bounds.x - a.x, -a.rx, bounds.w, a.rx + (below * a.rx) / a.belt)
  ctx.restore()
}

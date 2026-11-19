import type { Arch, Band, Glow, LayerOf } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'

/**
 * MEDIUM: the app's own sky, a smooth wash with no marks: the gradient from zenith to horizon, a three-layer glow round
 * the sun (broad warm sky, a nearer brightening, the aureole), the twilight glow where the sun crosses the land, Earth's
 * shadow with the pink belt above it opposite the sun, a cool glow round the moon, and the haze band at the horizon,
 * rising from nothing to its strength at eye level and thinning just below it. ORDER: gradient, arch, glows, band.
 *
 * Two ways to lay the same wash: `paintSky` on a canvas, and `skyBackground` as CSS backgrounds (the app and the harness
 * lay the base as the sky canvas's own background: the browser composites a CSS gradient for nothing, where a canvas
 * pays per pixel each time the light changes; see the plan's §6, C6).
 */
export function paintSky(ctx: Ctx2D, desc: LayerOf<'sky'>, _env: PaintEnv): void {
  const { x, y, w, h } = desc.bounds
  const gradient = ctx.createLinearGradient(0, y, 0, y + h)
  for (const [at, rgb] of desc.stops) gradient.addColorStop(Math.min(1, Math.max(0, at)), css(rgb))
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, w, h)
  if (desc.arch) paintArch(ctx, desc.arch, desc.bounds)
  for (const glow of desc.glow) paintGlow(ctx, glow, desc.bounds)
  if (desc.band) paintBand(ctx, desc.band, desc.bounds)
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

/** Earth's shadow and the belt, as stops on an ellipse round the antisolar point on the horizon. */
function archStops(a: Arch): [number, string][] {
  const f = (px: number) => Math.min(1, px / a.belt)
  return [[0, css(a.shadowRgb, 0.42 * a.alpha)], [f(a.shadow * 0.8), css(a.shadowRgb, 0.36 * a.alpha)],
    [f(a.shadow * 1.25), css(a.beltRgb, 0.3 * a.alpha)], [f(a.shadow + 0.45 * (a.belt - a.shadow)), css(a.beltRgb, 0.22 * a.alpha)],
    [1, css(a.beltRgb, 0)]]
}

function paintArch(ctx: Ctx2D, a: Arch, bounds: LayerOf<'sky'>['bounds']) {
  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.scale(1, a.belt / a.rx)
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, a.rx)
  for (const [at, colour] of archStops(a)) fill.addColorStop(at, colour)
  ctx.fillStyle = fill
  ctx.fillRect(bounds.x - a.x, -a.rx, bounds.w, a.rx)
  ctx.restore()
}

/** The band's stops (px from its top `band.y − band.h` to its bottom `band.y + 0.3 band.h`). */
function bandStops(band: Band): [number, string][] {
  return [[0, css(band.rgb, 0)], [0.45, css(band.rgb, band.alpha * 0.35)], [1 / 1.3, css(band.rgb, band.alpha)], [1, css(band.rgb, band.alpha * 0.4)]]
}

function paintBand(ctx: Ctx2D, band: Band, bounds: LayerOf<'sky'>['bounds']) {
  const { x, y, w, h } = bounds
  const top = Math.max(y, band.y - band.h), bottom = Math.min(y + h, band.y + band.h * 0.3)
  if (bottom <= top) return
  const haze = ctx.createLinearGradient(0, band.y - band.h, 0, band.y + band.h * 0.3)
  for (const [at, colour] of bandStops(band)) haze.addColorStop(at, colour)
  ctx.fillStyle = haze
  ctx.fillRect(x, top, w, bottom - top)
}

const px = (v: number) => `${Math.round(v * 100) / 100}px`

/**
 * The same base as CSS backgrounds over the layer's box (first listed is on top): the band, the glows, the arch, the
 * gradient. Pure: a string from the desc.
 */
export function skyBackground(desc: LayerOf<'sky'>): string {
  const { h } = desc.bounds
  const out: string[] = []
  const band = desc.band
  if (band) {
    const top = band.y - band.h, span = band.h * 1.3, bottom = top + span
    const stops = bandStops(band).map(([at, colour]) => `${colour} ${px(top + at * span)}`)
    out.push(`linear-gradient(180deg, ${css(band.rgb, 0)} ${px(Math.max(0, top))}, ${stops.join(', ')}, ${css(band.rgb, 0)} ${px(bottom)})`)
  }
  for (const g of [...desc.glow].reverse()) {
    out.push(`radial-gradient(${px(g.r)} ${px(g.ry ?? g.r)} at ${px(g.x)} ${px(g.y)}, ${css(g.rgb, g.alpha)} 0, ${css(g.rgb, 0)} 100%)`)
  }
  const a = desc.arch
  if (a) {
    // The arch only rises above the horizon: below eye level the land covers it.
    out.push(`radial-gradient(${px(a.rx)} ${px(a.belt)} at ${px(a.x)} ${px(a.y)}, ${archStops(a).map(([at, colour]) => `${colour} ${(at * 100).toFixed(2)}%`).join(', ')})`)
  }
  out.push(`linear-gradient(180deg, ${desc.stops.map(([at, rgb]) => `${css(rgb)} ${px(Math.min(1, Math.max(0, at)) * h)}`).join(', ')})`)
  return out.join(', ')
}

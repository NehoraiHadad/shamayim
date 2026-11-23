import type { Band, Glow, LayerOf, RGB } from '../../../../src/scene/model/types'
import { css, mix, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { fractal, rng } from '../../../../src/scene/paint/shared/base/core'
import { carve, type P } from './carve'
import { pigment, valued } from './palette'

/*
 * The sky as one inked block: the model's gradient and haze as a graded wipe of ink down the paper, the plank's grain
 * through it as long level lines, and the glow round the sun or the moon wiped out of the ink.
 */

/** The gradient's stops; the grain's lines, their length (px), width and how far their value goes from the ink's. */
const STOPS = 40, GRAIN = 260, LONG = [30, 220] as const, THIN = [0.3, 0.7] as const, DARK = -0.01, LIGHT = 0.02
/** The rings' slow wave: its height (px) and frequency (1/px). */
const WAVE = 9, FREQ = 0.004

export function paintDrawnSky(ctx: Ctx2D, desc: LayerOf<'sky'>, _env: PaintEnv): void {
  const { x, y, w, h } = desc.bounds, foot = desc.band ? desc.band.y + 8 : y + h
  const inkAt = (at: number) => pigment(hazed(desc, Math.min(foot, at), (Math.min(foot, at) - y) / h))
  const wipe = ctx.createLinearGradient(0, y, 0, y + h)
  for (let i = 0; i <= STOPS; i++) wipe.addColorStop(i / STOPS, css(inkAt(y + (i / STOPS) * h)))
  ctx.fillStyle = wipe
  ctx.fillRect(x, y, w, h)
  for (const glow of desc.glow) wiped(ctx, glow)
  const r = rng(4177)
  for (let n = 0; n < GRAIN; n++) {
    const at = y + ((n + r()) / GRAIN) * (foot - y), long = LONG[0] + (LONG[1] - LONG[0]) * r() ** 2, from = x - long + r() * (w + long)
    const lit = r() < 0.6, line: P[] = []
    for (let px = from; px <= from + long; px += 7) line.push([px, at + WAVE * (fractal(311, px, at, FREQ, 0.012, 2) - 0.5)])
    ctx.beginPath()
    carve(ctx, line, THIN[0] + (THIN[1] - THIN[0]) * r(), n, 0.9)
    ctx.fillStyle = css(valued(inkAt(at), lit ? LIGHT : DARK), 0.75)
    ctx.fill()
  }
}

/** The gradient's colour at a row, the haze band over it. */
function hazed({ stops, band }: LayerOf<'sky'>, y: number, t: number): RGB {
  let at = 1
  while (at < stops.length - 1 && stops[at][0] < t) at++
  const [t0, a] = stops[at - 1], [t1, b] = stops[at]
  const rgb = mix(a, b, Math.min(1, Math.max(0, (t - t0) / Math.max(1e-6, t1 - t0))))
  return band ? mix(rgb, band.rgb, band.alpha * share(band, y)) : rgb
}

/** The haze band's strength down its depth (the stops of `skyBackground`). */
function share(band: Band, y: number): number {
  const t = (y - band.y + band.h) / band.h
  return t <= 0 ? 0 : t < 0.585 ? (0.35 * t) / 0.585 : t <= 1 ? 0.35 + (0.65 * (t - 0.585)) / 0.415 : 1
}

/** A glow: the ink wiped thinner toward its middle. */
function wiped(ctx: Ctx2D, g: Glow) {
  const rgb = pigment(g.rgb, 0.4)
  ctx.save()
  ctx.translate(g.x, g.y)
  ctx.scale(1, (g.ry ?? g.r) / g.r)
  const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r)
  fade.addColorStop(0, css(rgb, g.alpha))
  fade.addColorStop(0.35, css(rgb, g.alpha * 0.45))
  fade.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = fade
  ctx.fillRect(-g.r, -g.r, 2 * g.r, 2 * g.r)
  ctx.restore()
}

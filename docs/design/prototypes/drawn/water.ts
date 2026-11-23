import type { LayerOf, RGB, Streak } from '../../../../src/scene/model/types'
import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, mix, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { running, twinkling } from '../../../../src/scene/paint/shared/land/water'
import { carve, type P } from './carve'
import { pigment, valued } from './palette'

/*
 * Water as a wipe of ink that deepens to the near, with level wave cuts; the wind as carved dashes, the light's path as
 * stacked lozenges. Places, colours and motion are the model's.
 */

type Stops = readonly (readonly [number, RGB])[]
/** How much deeper the ink is at the near edge, and how far a wave cut's value goes from it. */
const WIPED = 0.06, WAVE = 0.055, KEEP = 0.55
const hair = (env: PaintEnv) => Math.max(0.55, 1 / env.scale)

export function paintCutWater(ctx: Ctx2D, desc: LayerOf<'water'>, env: PaintEnv): void {
  const loop = desc.animated?.frames ? desc.animated.frames.count / desc.animated.frames.fps : 0
  const t = loop ? ((env.phase / loop) % 1 + 1) % 1 : 0
  desc.bands.forEach((band, n) => {
    outline(ctx, band.points)
    const xs = band.points.map((p) => p[0])
    flat(ctx, band.stops, Math.min(...xs), Math.max(...xs), band.top, band.bottom, 71 + n)
  })
  ctx.globalCompositeOperation = 'source-atop'
  for (const band of desc.bands) {
    ctx.beginPath()
    band.far.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.5) : ctx.moveTo(x, y + 0.5)))
    ctx.strokeStyle = css(pigment(band.rim.rgb, 0.3), band.rim.alpha)
    ctx.lineWidth = 1
    ctx.stroke()
  }
  const { ruffle } = desc
  dashes(ctx, running(ruffle.shade, t, ruffle.drift, 0), pigment(ruffle.dark, -0.5), 1.1 * hair(env))
  dashes(ctx, running(ruffle.lit, t, ruffle.drift, 0.5), pigment(ruffle.light, 0.2), 1.3 * hair(env))
  for (const glint of desc.glints) {
    path(ctx, glint)
    dashes(ctx, twinkling(glint.sparks, t), pigment(glint.rgb, 0.4), 1.5 * hair(env), 1)
  }
  ctx.globalCompositeOperation = 'source-over'
  datum(ctx, desc)
}

/** The current outline filled with its gradient as a wipe of ink, with long level wave cuts, closer far off. */
export function flat(ctx: Ctx2D, stops: Stops, x0: number, x1: number, top: number, bottom: number, seed: number) {
  const at = (u: number): RGB => {
    let n = 1
    while (n < stops.length - 1 && stops[n][0] < u) n++
    const [t0, a] = stops[n - 1], [t1, b] = stops[n] ?? stops[n - 1]
    return mix(a, b, t1 > t0 ? Math.min(1, Math.max(0, (u - t0) / (t1 - t0))) : 0)
  }
  ctx.save()
  const wipe = ctx.createLinearGradient(0, top, 0, bottom)
  for (let n = 0; n <= 8; n++) wipe.addColorStop(n / 8, css(pigment(valued(at(n / 8), -WIPED * (n / 8) ** 2))))
  ctx.fillStyle = wipe
  ctx.fill()
  ctx.clip()
  for (let y = top + 1.2, gap = 1.3, n = 0; y < bottom; y += gap, gap *= 1.16, n++) {
    const r = rng(seed + n * 31), u = (y - top) / Math.max(1, bottom - top), ink = at(u)
    for (const [by, share] of [[-WAVE, 0.65], [WAVE, 0.35]] as const) {
      ctx.beginPath()
      for (let x = x0 - 40 * r(); x < x1;) {
        const long = (10 + 46 * r()) * (0.5 + u)
        if (r() < share) carve(ctx, [0, 0.14, 0.28, 0.43, 0.57, 0.71, 0.86, 1].map((k): P => [x + k * long, y + (by > 0 ? gap / 2 : 0) + (0.2 + 0.5 * u) * Math.sin(k * long * 0.5 + n)]), 0.4 + 0.5 * u, n, 0.9)
        x += long * (1.1 + r())
      }
      ctx.fillStyle = css(pigment(valued(ink, by), by < 0 ? -0.5 : 0.2), 0.7)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Tapered dashes, the strongest of them; each drawn whole. */
export function dashes(ctx: Ctx2D, streaks: readonly Streak[], rgb: RGB, thick: number, keep = KEEP) {
  const peak = Math.max(0, ...streaks.map((s) => s.alpha))
  if (peak <= 0.005) return
  ctx.fillStyle = css(rgb, Math.min(1, 0.22 + peak * 1.1))
  ctx.beginPath()
  streaks.forEach((s, i) => {
    if ((i * 0.618034) % 1 > keep) return
    const w = s.w * 1.6, h = thick * (0.45 + 0.55 * (s.alpha / peak))
    carve(ctx, [0, 0.2, 0.4, 0.6, 0.8, 1].map((u): P => [s.x + u * w, s.y + 0.5 * h * Math.sin(6.3 * u + i)]), h, i, 0.9)
  })
  ctx.fill()
}

function path(ctx: Ctx2D, { x, top, bottom, spread, rgb, alpha }: LayerOf<'water'>['glints'][number]) {
  const deep = bottom - top, many = Math.max(3, Math.round(deep / 2.6)), r = rng(17)
  ctx.fillStyle = css(pigment(rgb, 0.4), Math.min(0.8, alpha * 0.55))
  ctx.beginPath()
  for (let n = 0; n < many; n++) {
    const u = (n + 0.5) / many, half = (0.8 + u * deep * spread * 0.5) * (0.5 + 0.7 * r()), y = top + u * deep, cx = x + (r() - 0.5) * half
    ctx.moveTo(cx - half, y)
    ctx.quadraticCurveTo(cx, y - 1.1, cx + half, y)
    ctx.quadraticCurveTo(cx, y + 1.1, cx - half, y)
  }
  ctx.fill()
}

function datum(ctx: Ctx2D, desc: LayerOf<'water'>) {
  if (!desc.datum) return
  ctx.setLineDash([1, 4])
  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  ctx.strokeStyle = css(desc.datum.rgb, desc.datum.alpha)
  ctx.beginPath()
  for (const seg of desc.datum.segments) { ctx.moveTo(seg.x1, desc.datum.y); ctx.lineTo(seg.x2, desc.datum.y) }
  ctx.stroke()
  ctx.setLineDash([])
}

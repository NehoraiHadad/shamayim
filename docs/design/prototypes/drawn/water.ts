import type { LayerOf, RGB, Streak } from '../../../../src/scene/model/types'
import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, mix, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { running, twinkling } from '../../../../src/scene/paint/shared/land/water'
import { pigment } from './palette'

/*
 * Water as a few flat bands of paint down its depth, their edges broken into long horizontal tongues; the wind as a few
 * tapered dashes, the light's path as stacked lozenges. Places, colours and motion are the model's.
 */

type Stops = readonly (readonly [number, RGB])[]
const BANDS = 4, TONGUE = 34, KEEP = 0.55
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

/** The current outline filled with its gradient as flat bands, laid back to front inside it. */
export function flat(ctx: Ctx2D, stops: Stops, x0: number, x1: number, top: number, bottom: number, seed: number) {
  const at = (u: number): RGB => {
    let n = 1
    while (n < stops.length - 1 && stops[n][0] < u) n++
    const [t0, a] = stops[n - 1], [t1, b] = stops[n] ?? stops[n - 1]
    return mix(a, b, t1 > t0 ? Math.min(1, Math.max(0, (u - t0) / (t1 - t0))) : 0)
  }
  ctx.save()
  ctx.fillStyle = css(pigment(at(0.5 / BANDS)))
  ctx.fill()
  ctx.clip()
  const r = rng(seed)
  for (let n = 1; n < BANDS; n++) {
    const y = top + ((bottom - top) * n) / BANDS, reach = Math.min(1.6, (bottom - top) / BANDS / 3)
    ctx.beginPath()
    ctx.moveTo(x0, bottom + 2)
    ctx.lineTo(x0, y)
    for (let x = x0, up = 1; x < x1 + TONGUE; up = -up) {
      const next = x + TONGUE * (0.4 + r())
      ctx.bezierCurveTo(x + 3, y + up * reach, next - 3, y + up * reach, next, y)
      x = next
    }
    ctx.lineTo(x1 + 2 * TONGUE, bottom + 2)
    ctx.fillStyle = css(pigment(at((n + 0.5) / BANDS)))
    ctx.fill()
  }
  ctx.restore()
}

/** Tapered dashes, the strongest of them; each drawn whole. */
export function dashes(ctx: Ctx2D, streaks: readonly Streak[], rgb: RGB, thick: number, keep = KEEP) {
  const peak = Math.max(0, ...streaks.map((s) => s.alpha))
  if (peak <= 0.005) return
  ctx.fillStyle = css(rgb, Math.min(1, peak * 1.25))
  ctx.beginPath()
  streaks.forEach((s, i) => {
    if ((i * 0.618034) % 1 > keep) return
    const w = s.w * 1.25, h = thick * (0.45 + 0.55 * (s.alpha / peak))
    ctx.moveTo(s.x, s.y)
    ctx.quadraticCurveTo(s.x + w / 2, s.y - h, s.x + w, s.y)
    ctx.quadraticCurveTo(s.x + w / 2, s.y + h, s.x, s.y)
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

import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf, RGB, Streak } from '../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { loopAt, paintDatum, running, twinkling } from '../shared/land/water'
import { carve, type P } from './kit/carve'
import { pigment, skied } from './kit/palette'
import { layWater } from './waterInk'

/*
 * Water as a wipe of ink that deepens to the near, with level wave cuts; the wind as carved dashes, the light's path as
 * stacked lozenges and its sparks. Places, colours, strengths and motion are the model's.
 */

/** The share of the wind's strokes that are cut, each cut whole and longer; the strength of a dash by the strongest of its kind. */
const KEEP = 0.55, LONGER = 1.6, FAINT = 0.22, BY_PEAK = 1.1, NONE = 0.005
/** The light's path: the px between its lozenges, how far its width breathes over the loop, its strength. */
const APART = 2.6, BREATHE = 0.07, GLINT = 0.55, GLINT_MOST = 0.8

type Glint = LayerOf<'water'>['glints'][number]

export function paintDrawnWater(ctx: Ctx2D, desc: LayerOf<'water'>, env: PaintEnv): void {
  const t = loopAt(desc, env), hair = Math.max(0.55, 1 / env.scale), { ruffle } = desc
  ctx.save()
  desc.bands.forEach((band, n) => layWater(ctx, band, 71 + n))
  ctx.globalCompositeOperation = 'source-atop'
  for (const { far, rim } of desc.bands) {
    if (far.length < 2) continue
    ctx.beginPath()
    far.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + hair / 2) : ctx.moveTo(x, y + hair / 2)))
    ctx.strokeStyle = css(skied(rim.rgb, 0.3), rim.alpha * smoothstep(0, 0.04, rim.alpha))
    ctx.lineWidth = hair * 1.5
    ctx.stroke()
  }
  dashes(ctx, running(ruffle.shade, t, ruffle.drift, 0), skied(ruffle.dark, -0.5), 1.1 * hair)
  dashes(ctx, running(ruffle.lit, t, ruffle.drift, 0.5), skied(ruffle.light, 0.2), 1.3 * hair)
  for (const glint of desc.glints) {
    path(ctx, glint, 1 + BREATHE * Math.sin(2 * Math.PI * t))
    dashes(ctx, twinkling(glint.sparks, t), pigment(glint.rgb, 0.4), 1.5 * hair, 1)
  }
  ctx.globalCompositeOperation = 'source-over'
  paintDatum(ctx, desc)
  ctx.restore()
}

/** Tapered dashes: a stroke's strength is its thickness. */
function dashes(ctx: Ctx2D, streaks: readonly Streak[], rgb: RGB, thick: number, keep = KEEP) {
  const peak = Math.max(0, ...streaks.map((s) => s.alpha))
  if (peak <= NONE) return
  ctx.beginPath()
  streaks.forEach((s, i) => {
    if ((i * 0.618034) % 1 > keep) return
    const w = s.w * LONGER, h = thick * (0.45 + 0.55 * (s.alpha / peak))
    carve(ctx, [0, 0.2, 0.4, 0.6, 0.8, 1].map((u): P => [s.x + u * w, s.y + 0.5 * h * Math.sin(6.3 * u + i)]), h, i, 0.9)
  })
  ctx.fillStyle = css(rgb, Math.min(1, peak * (BY_PEAK + FAINT / Math.max(peak, FAINT))))
  ctx.fill()
}

/** The light's path as a stack of lozenges, wider toward the eye. */
function path(ctx: Ctx2D, { x, top, bottom, spread, rgb, alpha }: Glint, breathe: number) {
  const deep = bottom - top, many = Math.max(3, Math.round(deep / APART))
  ctx.beginPath()
  for (let n = 0; n < many; n++) {
    const u = (n + 0.5) / many, odd = (n * 0.618034) % 1, half = (0.8 + u * deep * spread * 0.5) * (0.5 + 0.7 * odd) * breathe
    const y = top + u * deep, cx = x + ((n * 0.754878) % 1 - 0.5) * half
    ctx.moveTo(cx - half, y)
    ctx.quadraticCurveTo(cx, y - 1.1, cx + half, y)
    ctx.quadraticCurveTo(cx, y + 1.1, cx - half, y)
  }
  ctx.fillStyle = css(pigment(rgb, 0.4), Math.min(GLINT_MOST, alpha * GLINT))
  ctx.fill()
}

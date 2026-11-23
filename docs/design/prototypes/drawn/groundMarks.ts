import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { displace, rng, sample, tube } from '../../../../src/scene/paint/shared/base/core'
import { css, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import { TEXEL } from '../../../../src/scene/model/planeBands'
import type { PlaneTexelCtx } from '../../../../src/scene/paint/shared/land/planeTexel'
import { carve, type P } from './carve'
import { pigment, valued } from './palette'

/* The hand's marks on the ground: the gullies and terraces the model gives, as clean cuts, and dabs along the slope. */

/** The crest's key line (px). */
const KEYS = { near: 0.9, far: 0.65, back: 0.45 } as const
const CUT: RGB = [0.1, 0.09, 0.16]

export function groundLines(ctx: Ctx2D, desc: LayerOf<'plane'>): void {
  desc.gullies.forEach((gully, i) => {
    const line = displace(sample(gully.points, false, 5), 1.1, 0.3, 2, desc.grain.seed + i * 13)
    if (line.length < 2) return
    ctx.beginPath()
    tube(line, gully.w * 0.6, gully.w * 0.1, false).forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = css(CUT, gully.alpha * 1.1)
    ctx.fill()
  })
  if (!desc.terraces.length) return
  ctx.beginPath()
  for (const run of desc.terraces) run.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.45) : ctx.moveTo(x, y + 0.45)))
  ctx.strokeStyle = css(CUT, 0.2)
  ctx.lineWidth = 0.7
  ctx.stroke()
}

/** Cuts a plane takes per 1000 px²; their length (px) at the foot, their width, how far their value goes from the ground's. */
const DENSITY = { near: 26, far: 8, back: 1.5 } as const
const LONG = [3, 20] as const, WIDE = [0.35, 0.6] as const, LIGHT = 0.06, DARK = -0.13, DARKS = 0.78, SEED = 5501

/** The graver's cuts along the slope: mostly dark, closer and shorter far off. */
export function groundDabs(ctx: Ctx2D, desc: LayerOf<'plane'>, t: PlaneTexelCtx, colourAt: (x: number, y: number) => RGB): void {
  const { bounds } = desc, r = rng(SEED + desc.grain.seed)
  const many = Math.round((DENSITY[desc.plane] * bounds.w * bounds.h) / 1000)
  for (let n = 0; n < many; n++) {
    const x = bounds.x + r() * bounds.w, y = bounds.y + r() * bounds.h, long = r(), lift = r(), bow = r() - 0.5, wide = r()
    const i = Math.min(t.wPx - 1, Math.max(0, Math.floor((x - bounds.x) / TEXEL)))
    if (y < t.crestY[i] + 2) continue
    const deep = Math.min(1, (y - t.crestY[i]) / 90), len = (LONG[0] + (LONG[1] - LONG[0]) * long * long) * (0.45 + 0.55 * deep)
    const step = 6, slope = (t.crestY[Math.min(t.wPx - 1, i + step)] - t.crestY[Math.max(0, i - step)]) / (2 * step * TEXEL)
    const dy = len * slope * 0.7 * (1 - 0.6 * deep)
    ctx.beginPath()
    carve(ctx, [-0.5, -0.17, 0.17, 0.5].map((u): P => [x + u * len, y + u * dy + bow * (1 - 4 * u * u)]), WIDE[0] + (WIDE[1] - WIDE[0]) * wide * deep, SEED + n, 1)
    ctx.fillStyle = css(pigment(valued(colourAt(x, y), lift < DARKS ? DARK : LIGHT), lift < DARKS ? -0.3 : 0.3, 1.05), 0.6)
    ctx.fill()
  }
}

/** The crest's key line and the ink wiped deeper to the plane's foot. */
export function groundKey(ctx: Ctx2D, desc: LayerOf<'plane'>, t: PlaneTexelCtx, rgb: RGB): void {
  const { bounds } = desc, key = pigment(valued(rgb, -0.16), -0.8)
  if (desc.plane === 'near') {
    const wipe = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.h)
    wipe.addColorStop(0.45, css(key, 0))
    wipe.addColorStop(1, css(key, 0.42))
    ctx.fillStyle = wipe
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
  }
  const line = Array.from({ length: Math.floor(t.wPx / 2) }, (_, i): P => [bounds.x + (i * 2 + 0.5) * TEXEL, t.crestY[i * 2] + 0.35])
  ctx.beginPath()
  carve(ctx, line, KEYS[desc.plane], SEED, 0)
  ctx.fillStyle = css(key, 0.75)
  ctx.fill()
}

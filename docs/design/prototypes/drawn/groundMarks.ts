import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { displace, rng, sample, tube } from '../../../../src/scene/paint/shared/base/core'
import { css, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import { TEXEL } from '../../../../src/scene/model/planeBands'
import type { PlaneTexelCtx } from '../../../../src/scene/paint/shared/land/planeTexel'
import { pigment, valued } from './palette'

/* The hand's marks on the ground: the gullies and terraces the model gives, as clean cuts, and dabs along the slope. */

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

/** Dabs a plane takes per 1000 px²; their length (px) at the foot, their thickness, how far their value goes from the ground's. */
const DENSITY = { near: 9, far: 2.5, back: 0 } as const
const LONG = [5, 15] as const, THICK = 1.15, LIGHT = 0.06, DARK = -0.055, SEED = 5501

export function groundDabs(ctx: Ctx2D, desc: LayerOf<'plane'>, t: PlaneTexelCtx, colourAt: (x: number, y: number) => RGB): void {
  const { bounds } = desc, r = rng(SEED + desc.grain.seed)
  const many = Math.round((DENSITY[desc.plane] * bounds.w * bounds.h) / 1000)
  for (let n = 0; n < many; n++) {
    const x = bounds.x + r() * bounds.w, y = bounds.y + r() * bounds.h, long = r(), lift = r(), bow = r() - 0.5
    const i = Math.min(t.wPx - 1, Math.max(0, Math.floor((x - bounds.x) / TEXEL)))
    if (y < t.crestY[i] + 2) continue
    const deep = Math.min(1, (y - t.crestY[i]) / 90), len = (LONG[0] + (LONG[1] - LONG[0]) * long) * (0.45 + 0.55 * deep)
    const step = 6, slope = (t.crestY[Math.min(t.wPx - 1, i + step)] - t.crestY[Math.max(0, i - step)]) / (2 * step * TEXEL)
    const dy = len * slope * 0.7 * (1 - 0.6 * deep), thick = THICK * (0.5 + 0.7 * deep)
    ctx.beginPath()
    ctx.moveTo(x - len / 2, y - dy / 2)
    ctx.quadraticCurveTo(x, y - thick + bow * 2, x + len / 2, y + dy / 2)
    ctx.quadraticCurveTo(x, y + thick + bow * 2, x - len / 2, y - dy / 2)
    ctx.fillStyle = css(pigment(valued(colourAt(x, y), lift < 0.5 ? DARK : LIGHT), 0, 1.05), 0.75)
    ctx.fill()
  }
}

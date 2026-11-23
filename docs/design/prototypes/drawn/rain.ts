import type { LayerOf, ShaftDesc } from '../../../../src/scene/model/types'
import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { pigment, valued } from './palette'

/*
 * A curtain of rain or snow as a few flat leaning panes, one over another, with clean slanted edges and a foot cut into
 * long teeth, and a handful of drawn strokes of heavier fall.
 */

const PANES = [[0, 0.62, 1], [-0.18, 0.4, 0.86], [0.2, 0.26, 0.94]] as const
const PANE = 0.5, STROKES = 9

export function paintCutShafts(ctx: Ctx2D, desc: LayerOf<'shafts'>, env: PaintEnv): void {
  const { bounds, period } = desc
  for (const s of desc.shafts) {
    for (const k of [-1, 0, 1]) {
      const x = s.x + k * period
      if (x + s.w + Math.abs(s.lean) < bounds.x || x - s.w - Math.abs(s.lean) > bounds.x + bounds.w) continue
      curtain(ctx, { ...s, x }, env)
    }
  }
}

function curtain(ctx: Ctx2D, s: Omit<ShaftDesc, 'id'>, env: PaintEnv) {
  const h = s.bottom - s.top, r = rng(s.seed)
  if (h <= 1 || s.w < 1 || s.alpha < 0.01) return
  const at = (u: number, t: number): [number, number] => [s.x + u * s.w * (0.86 + 0.2 * t) + s.lean * t, s.top + t * h]
  const rgb = pigment(s.rgb, -0.5)
  for (const [mid, half, reach] of PANES) {
    const teeth: [number, number][] = []
    for (let n = 0; n <= 6; n++) teeth.push(at(mid + half * (1 - n / 3), reach - (n % 2 ? 0.07 + 0.12 * r() : 0.02 * r())))
    outline(ctx, [at(mid - half, 0), at(mid + half, 0), ...teeth])
    ctx.fillStyle = css(rgb, Math.min(0.75, s.alpha * PANE))
    ctx.fill()
  }
  ctx.strokeStyle = css(valued(rgb, 0.1), Math.min(0.5, s.alpha * 0.5))
  ctx.lineWidth = Math.max(0.6, 1 / env.scale)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let n = 0; n < STROKES; n++) {
    const u = (r() - 0.5) * 0.95, t = 0.08 + 0.55 * r(), len = 0.1 + 0.22 * r()
    ctx.moveTo(...at(u, t))
    ctx.lineTo(...at(u, t + len))
  }
  ctx.stroke()
}

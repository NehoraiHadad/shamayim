import type { LayerOf, ShaftDesc } from '../../../../src/scene/model/types'
import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, outline, type Ctx2D, type PaintEnv } from '../../../../src/scene/paint/shared/base/hand'
import { carve, type P } from './carve'
import { papered, pigment, valued } from './palette'

/*
 * A curtain of rain as the print has it: a pane of graded ink, its sides let go, and through it many fine lines cut side by
 * side along the fall, some in ink, some bare paper. Snow is the same pane, flecked instead of lined.
 */

/** The pane's leaves (half width against the curtain's), their strength, and where down the fall it is strongest. */
const LEAVES = Array.from({ length: 12 }, (_, n) => 1.05 - 0.08 * n), LEAF = 0.13, STRONG = 0.22
/** Lines for a px of width, their length against the fall, their width (px), and the share that are paper. */
const LINES = 1.1, LONG = [0.12, 0.5] as const, WIDE = 0.5, PAPER = 0.4, FLECKS = 2.2

type Curtain = Omit<ShaftDesc, 'id'>

export function paintCutShafts(ctx: Ctx2D, desc: LayerOf<'shafts'>, env: PaintEnv): void {
  const { bounds, period } = desc
  for (const s of desc.shafts) {
    for (const k of [-1, 0, 1]) {
      const x = s.x + k * period
      if (x + s.w + Math.abs(s.lean) < bounds.x || x - s.w - Math.abs(s.lean) > bounds.x + bounds.w) continue
      curtain(ctx, { ...s, x }, desc.precip === 'snow', env)
    }
  }
}

function curtain(ctx: Ctx2D, s: Curtain, snow: boolean, env: PaintEnv) {
  const h = s.bottom - s.top, r = rng(s.seed), rgb = pigment(s.rgb, -0.25, 1.2)
  if (h <= 1 || s.w < 1 || s.alpha < 0.01) return
  const at = (u: number, t: number): P => [s.x + u * s.w * (0.82 + 0.22 * t) + s.lean * t, s.top + t * h]
  const down = (c: string[]) => {
    const g = ctx.createLinearGradient(0, s.top, 0, s.bottom)
    c.forEach((v, i) => g.addColorStop([0, STRONG, 0.62, 1][i], v))
    return g
  }
  const strong = Math.min(0.9, s.alpha * 1.5)
  ctx.save()
  ctx.fillStyle = down([css(rgb, 0), css(rgb, strong * LEAF), css(rgb, strong * LEAF * 0.75), css(rgb, strong * LEAF * 0.3)])
  for (const half of LEAVES) {
    outline(ctx, [at(-half, 0), at(half, 0), at(half, 1), at(-half, 1)])
    ctx.fill()
  }
  const many = Math.min(170, Math.round(s.w * 2 * (snow ? FLECKS : LINES))), hair = Math.max(WIDE, 1 / env.scale)
  for (const [share, ink] of [[1 - PAPER, pigment(valued(rgb, -0.13), -0.8)], [PAPER, papered(valued(rgb, 0.14), 0.3)]] as const) {
    ctx.beginPath()
    for (let n = 0; n < many * share; n++) {
      // Denser to the middle, as the pane is.
      const u = (r() + r() - 1) * 0.98, t = 0.04 + 0.86 * r(), long = LONG[0] + (LONG[1] - LONG[0]) * r() ** 2, w = hair * (0.6 + 0.7 * r())
      if (snow) { const [x, y] = at(u, t); ctx.moveTo(x + w, y); ctx.arc(x, y, w, 0, Math.PI * 2) }
      else carve(ctx, [at(u, t), at(u, t + long / 3), at(u, t + (2 * long) / 3), at(u, t + long)], w, n, 1)
    }
    ctx.fillStyle = down([css(ink, 0), css(ink, Math.min(0.75, strong)), css(ink, strong * 0.6), css(ink, strong * 0.2)])
    ctx.fill()
  }
  ctx.restore()
}

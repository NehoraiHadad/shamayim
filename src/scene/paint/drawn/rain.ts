import type { LayerOf, ShaftDesc } from '../../model/types'
import { rng } from '../shared/base/core'
import { css, type Ctx2D, type PaintEnv } from '../shared/base/hand'
import { paintShafts, type Fibres } from '../shared/weather/curtain'
import { paintEdge } from '../shared/weather/edge'
import { carve, type P } from './kit/carve'
import { papered, skied, valued } from './kit/palette'

/*
 * A curtain as a print: a few long planes of heavier and lighter ink, and through them many fine lines cut side by side along
 * the fall, some in ink, some bare paper. Snow is flecked instead of lined. Pure: the desc and the scratch surfaces from `env`.
 */

/** The planes of heavier and lighter fall: no fibres. */
const PLANES: Fibres = { thick: 0.7, rate: 0.62, long: 0.06, octaves: 1, gather: 3 }
/** Cuts for a px of the curtain's width, at most, the share that are paper; their length against the fall, their width (px). */
const CUTS = { rain: 2.2, snow: 4.4, most: 170, paper: 0.4 } as const, LONG = [0.12, 0.5] as const, WIDE = 0.5, REACH = 0.42
/** The fall's strength down the curtain, and a cut's against the curtain's. */
const DOWN = [[0, 0], [0.22, 1], [0.62, 0.6], [1, 0.2]] as const, STRONG = 1.2, MOST = 0.65
/** A paper cut's step over the fall, by day: it fades with the light. */
const LIFT = 0.14, BRIGHT = 1.3

const inked = <T extends { rgb: ShaftDesc['rgb'] }>(of: T): T => ({ ...of, rgb: skied(of.rgb, -0.25) })

export function paintDrawnShafts(ctx: Ctx2D, desc: LayerOf<'shafts'>, env: PaintEnv): void {
  paintShafts(ctx, { ...desc, shafts: desc.shafts.map(inked) }, env, PLANES, (s) => cuts(ctx, s, desc.precip === 'snow', env))
}

/** The edge mark in the block's inks. */
export function paintDrawnEdge(ctx: Ctx2D, desc: LayerOf<'edge'>, env: PaintEnv): void {
  paintEdge(ctx, { ...desc, body: skied(desc.body), shade: skied(desc.shade, -0.5), curtain: skied(desc.curtain, -0.25) }, env, PLANES)
}

function cuts(ctx: Ctx2D, s: Omit<ShaftDesc, 'id'>, snow: boolean, env: PaintEnv) {
  const h = s.bottom - s.top, strong = Math.min(MOST, s.alpha * STRONG)
  if (h <= 1 || s.w < 1 || s.alpha < 0.01) return
  const at = (u: number, t: number): P => [s.x + u * s.w * REACH * (1 + 0.24 * t) + s.lean * t, s.top + t * h]
  const many = Math.min(CUTS.most, Math.round(s.w * (snow ? CUTS.snow : CUTS.rain))), hair = Math.max(WIDE, 1 / env.scale)
  const lift = LIFT * Math.min(1, Math.max(...s.rgb) * BRIGHT)
  for (const [pass, share, ink] of [[0, 1 - CUTS.paper, skied(valued(s.rgb, -0.13), -0.8)], [1, CUTS.paper, papered(valued(s.rgb, lift), 0.3)]] as const) {
    const r = rng(s.seed + pass)
    ctx.beginPath()
    for (let n = 0; n < many * share; n++) {
      // Denser to the middle, as the planes are.
      const u = r() + r() - 1, t = 0.04 + 0.86 * r(), long = LONG[0] + (LONG[1] - LONG[0]) * r() ** 2, w = hair * (0.6 + 0.7 * r())
      if (!snow) carve(ctx, [0, 1 / 3, 2 / 3, 1].map((k) => at(u, t + k * long)), w, n, 1)
      else {
        const [x, y] = at(u, t)
        ctx.moveTo(x + w, y)
        ctx.arc(x, y, w, 0, 2 * Math.PI)
      }
    }
    const wipe = ctx.createLinearGradient(0, s.top, 0, s.bottom)
    for (const [t, a] of DOWN) wipe.addColorStop(t, css(ink, strong * a))
    ctx.fillStyle = wipe
    ctx.fill()
  }
}

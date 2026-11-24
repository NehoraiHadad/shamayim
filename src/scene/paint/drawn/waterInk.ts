import type { LayerOf, RGB } from '../../model/types'
import { rng } from '../shared/base/core'
import { css, mix, outline, type Ctx2D } from '../shared/base/hand'
import { carve, type P } from './kit/carve'
import { skied, valued } from './kit/palette'

/** How much deeper the ink is at the near edge, and how far a wave cut's value goes from it. */
const WIPED = 0.06, WAVE = 0.055
/** The first wave's place and the px to the next, each gap wider by a share; the cuts' strength. */
const FIRST = 1.2, GAP = 1.3, WIDER = 1.16, STRONG = 0.7
/** A cut's points along its length. */
const ALONG = [0, 0.14, 0.28, 0.43, 0.57, 0.71, 0.86, 1]

/** A body of water: its gradient as a wipe of ink, deeper to the near, with long level wave cuts, closer far off. */
export function layWater(ctx: Ctx2D, { points, stops, top, bottom }: LayerOf<'water'>['bands'][number], seed: number): void {
  const xs = points.map(([x]) => x), x0 = Math.min(...xs), x1 = Math.max(...xs)
  const wipe = ctx.createLinearGradient(0, top, 0, Math.max(top + 0.5, bottom))
  for (const [u, rgb] of stops) wipe.addColorStop(u, css(skied(valued(rgb, -WIPED * u * u))))
  ctx.save()
  outline(ctx, points)
  ctx.fillStyle = wipe
  ctx.fill()
  ctx.clip()
  for (let y = top + FIRST, gap = GAP, n = 0; y < bottom; y += gap, gap *= WIDER, n++) {
    const r = rng(seed + n * 31), u = (y - top) / Math.max(1, bottom - top), ink = inkAt(stops, u)
    for (const [by, share] of [[-WAVE, 0.65], [WAVE, 0.35]] as const) {
      ctx.beginPath()
      for (let x = x0 - 40 * r(); x < x1;) {
        const long = (10 + 46 * r()) * (0.5 + u)
        if (r() < share) carve(ctx, ALONG.map((k): P => [x + k * long, y + (by > 0 ? gap / 2 : 0) + (0.2 + 0.5 * u) * Math.sin(k * long * 0.5 + n)]), 0.4 + 0.5 * u, n, 0.9)
        x += long * (1.1 + r())
      }
      ctx.fillStyle = css(skied(valued(ink, by), by < 0 ? -0.5 : 0.2), STRONG)
      ctx.fill()
    }
  }
  ctx.restore()
}

function inkAt(stops: readonly (readonly [number, RGB])[], u: number): RGB {
  let n = 1
  while (n < stops.length - 1 && stops[n][0] < u) n++
  const [t0, a] = stops[n - 1], [t1, b] = stops[n] ?? stops[n - 1]
  return mix(a, b, t1 > t0 ? Math.min(1, Math.max(0, (u - t0) / (t1 - t0))) : 0)
}

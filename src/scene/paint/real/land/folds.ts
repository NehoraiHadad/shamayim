import { TEXEL } from '../../../model/planeBands'
import type { LayerOf } from '../../../model/types'
import { displace, sample } from '../../shared/base/core'
import type { PlaneTexelCtx } from '../../shared/land/planeTexel'

/* The gullies cut into the ground's form: a soft fold each, so its banks take the light as every slope does. */

/** A fold's half width (px) at the least and against the gully's, how it narrows; the gully's alpha of a whole fold. */
const LEAST = 4.6, WIDE = 3.4, NARROWS = 0.45, WHOLE = 0.13

/** How deep each texel lies in a fold, 0–1. */
export function foldsOf(t: PlaneTexelCtx, desc: LayerOf<'plane'>): Float32Array {
  const deep = new Float32Array(t.wPx * t.hPx)
  desc.gullies.forEach((gully, g) => {
    const line = displace(sample(gully.points, false, 4), 1.4, 0.2, 2, desc.grain.seed + g * 13), last = line.length - 1
    for (let k = 0; k < last; k++) {
      const along = (k + 0.5) / last, reach = Math.max(LEAST, gully.w * WIDE) * (1 - NARROWS * along)
      // Out of the slope at its head, gone before the foot.
      cut(deep, t, line[k], line[k + 1], reach, Math.min(1, gully.alpha / WHOLE, 6 * along, 1.9 * (1 - along)))
    }
  })
  return deep
}

type P = readonly [number, number]

function cut(deep: Float32Array, { wPx, hPx, bounds }: PlaneTexelCtx, [ax, ay]: P, [bx, by]: P, reach: number, whole: number) {
  const dx = bx - ax, dy = by - ay, long = Math.max(1e-6, dx * dx + dy * dy)
  const first = (a: number, b: number, from: number) => Math.max(0, Math.floor((Math.min(a, b) - reach - from) / TEXEL))
  const final = (a: number, b: number, from: number, count: number) => Math.min(count - 1, Math.ceil((Math.max(a, b) + reach - from) / TEXEL))
  const i0 = first(ax, bx, bounds.x), i1 = final(ax, bx, bounds.x, wPx), j1 = final(ay, by, bounds.y, hPx)
  for (let j = first(ay, by, bounds.y); j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = bounds.x + (i + 0.5) * TEXEL - ax, y = bounds.y + (j + 0.5) * TEXEL - ay
    const on = Math.min(1, Math.max(0, (x * dx + y * dy) / long)), far = Math.hypot(x - on * dx, y - on * dy) / reach
    if (far < 1) deep[j * wPx + i] = Math.max(deep[j * wPx + i], whole * (1 - far))
  }
}

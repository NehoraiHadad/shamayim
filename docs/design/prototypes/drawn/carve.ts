import { rng } from '../../../../src/scene/paint/shared/base/core'
import type { Ctx2D } from '../../../../src/scene/paint/shared/base/hand'

/*
 * The knife of the print: a carved line is a closed ribbon, its width stepping a little as the blade does, its ends cut
 * flat; and a billowed edge, a run of points turned into convex bumps. Pure: the points and the seed.
 */

export type P = readonly [number, number]

/** How much a line's width steps along its length, and how long a step is (px). */
const STEP = 0.35, RUN = 7
/** Where along a bump its points stand. */
const ALONG = [0, 0.04, 0.12, 0.25, 0.4, 0.6, 0.75, 0.88, 0.96]

/** A carved line through `pts`, added to the current path (fill it); `taper` thins the ends, 0 cut … 1 to a point. */
export function carve(ctx: Ctx2D, pts: readonly P[], w: number, seed: number, taper = 0.35): void {
  const n = pts.length
  if (n < 2) return
  const r = rng(seed), left: P[] = [], right: P[] = []
  let gone = 0, next = 0, level = 1
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(n - 1, i + 1)]
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1
    if (i) gone += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (gone >= next) { next = gone + RUN * (0.5 + r()); level = 1 + (r() - 0.5) * 2 * STEP }
    const u = i / (n - 1), half = (w / 2) * level * (1 - taper + taper * Math.min(1, 4 * u, 4 * (1 - u)))
    left.push([pts[i][0] - (dy / d) * half, pts[i][1] + (dx / d) * half])
    right.push([pts[i][0] + (dy / d) * half, pts[i][1] - (dx / d) * half])
  }
  closed(ctx, [...left, ...right.reverse()])
}

/** A closed loop's points at even steps (px). */
export function even(pts: readonly P[], step: number): P[] {
  const out: P[] = []
  let left = 0
  pts.forEach(([x0, y0], i) => {
    const [x1, y1] = pts[(i + 1) % pts.length], d = Math.hypot(x1 - x0, y1 - y0)
    for (; left < d; left += step) out.push([x0 + ((x1 - x0) * left) / d, y0 + ((y1 - y0) * left) / d])
    left -= d
  })
  return out
}

/** One bump from `a` to `b`, round at once at both ends, bulging to the left of the way by `out` of its length; `b` left out. */
export function bump([ax, ay]: P, [bx, by]: P, out: number): P[] {
  const dx = bx - ax, dy = by - ay
  return ALONG.map((u): P => {
    const up = out * Math.sqrt(1 - (2 * u - 1) ** 2)
    return [ax + dx * u + dy * up, ay + dy * u - dx * up]
  })
}

/** Adds points to the path as a closed shape. */
export function closed(ctx: Ctx2D, pts: readonly P[]): void {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

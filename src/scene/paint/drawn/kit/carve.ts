import { rng } from '../../shared/base/core'

/** The knife of the print: a carved line is a closed ribbon whose width steps a little, as the blade does. Pure: the points and the seed. */

export type P = readonly [number, number]

/** How much a line's width steps along its length, and how long a step is (px). */
const STEP = 0.35, RUN = 7

/** A carved line through `pts`, added to the path (fill it); `taper` thins the ends, 0 cut … 1 to a point. */
export function carve(path: CanvasPath, pts: readonly P[], w: number, seed: number, taper = 0.35): void {
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
  [...left, ...right.reverse()].forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)))
  path.closePath()
}

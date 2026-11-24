import { rng } from '../shared/base/core'
import { css, mix, type Ctx2D } from '../shared/base/hand'
import type { CapInks } from './cloudInks'
import { carve, type P } from './kit/carve'

/*
 * A cap: a crisp top of uneven bumps, its ink wiped away to nothing at its own foot, so that it stands on whatever is behind
 * it with no side of its own. It leans the way its mass faces. A key line here and there, seldom along all of it. Pure.
 */

export interface Cap { x: number; y: number; r: number; tilt: number; seed: number }

const LINE = 0.62, LINE_ALPHA = 0.6
/** The share of caps whose line runs the whole top. */
const WHOLE = 0.35
/** Where along a bump its points stand. */
const ALONG = [0, 0.04, 0.12, 0.25, 0.4, 0.6, 0.75, 0.88, 0.96]

/** One bump from `a` to `b`, round at once at both ends, bulging to the left of the way by `out` of its length; `b` left out. */
function bump([ax, ay]: P, [bx, by]: P, out: number): P[] {
  const dx = bx - ax, dy = by - ay
  return ALONG.map((u): P => {
    const up = out * Math.sqrt(1 - (2 * u - 1) ** 2)
    return [ax + dx * u + dy * up, ay + dy * u - dx * up]
  })
}

/** A cap's top, left to right: bumps of very uneven width. */
export function capTop({ x: cx, y: cy, r, tilt, seed }: Cap): P[] {
  const random = rng(seed), c = Math.cos(tilt), s = Math.sin(tilt)
  const many = 3 + Math.floor(random() * 4)
  const widths = Array.from({ length: many }, () => 0.3 + 1.7 * random() ** 2), whole = widths.reduce((a, b) => a + b, 0)
  const from = Math.PI * (0.96 + 0.06 * random()), to = Math.PI * (1.98 + 0.06 * random())
  let gone = 0
  const ends = [0, ...widths].map((w): P => {
    gone += w
    const a = from + ((to - from) * gone) / whole, k = 0.82 + 0.24 * random()
    return [Math.cos(a) * r * 1.12 * k, Math.sin(a) * r * 0.92 * k]
  })
  return ends.flatMap((p, i) => (i < many ? bump(p, ends[i + 1], 0.16 + 0.2 * random()) : [p]))
    .map(([x, y]): P => [cx + x * c - y * s, cy + x * s + y * c])
}

/** A cap laid over what stands behind it; `line`: how strong its key line is. */
export function paintCap(ctx: Ctx2D, { y, r, seed }: Cap, pts: readonly P[], ink: CapInks, line: number): void {
  const last = pts.length - 1
  ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.closePath()
  // Gone at the higher end, so that the side that closes it never shows: the light comes down on every cap alike.
  const wipe = ctx.createLinearGradient(0, y - r * 1.05, 0, Math.min(y - 0.1 * r, pts[0][1], pts[last][1]))
  wipe.addColorStop(0, css(ink.lit))
  wipe.addColorStop(0.35, css(mix(ink.lit, ink.local, 0.6)))
  wipe.addColorStop(0.75, css(mix(ink.local, ink.shade, 0.5), 0.7))
  wipe.addColorStop(1, css(ink.shade, 0))
  ctx.fillStyle = wipe
  ctx.fill()
  if (line <= 0.05) return
  const random = rng(seed + 1), cut = random() < WHOLE ? [0.06, 0.94] : [0.05 + 0.3 * random(), 0.95 - 0.35 * random()]
  ctx.beginPath()
  carve(ctx, pts.slice(Math.round(cut[0] * last), Math.round(cut[1] * last)), LINE * Math.min(1.25, 0.6 + r / 26), seed, 1)
  ctx.fillStyle = css(ink.key, LINE_ALPHA * line)
  ctx.fill()
}

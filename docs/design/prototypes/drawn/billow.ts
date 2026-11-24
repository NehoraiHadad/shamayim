import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import type { RGB } from '../../../../src/scene/model/types'
import { pressed, within } from './base'
import { bump, carve, closed, even, type P } from './carve'
import { loopsIn, type Frame, type Grid } from './contour'

/*
 * Cloud as a print: the mass's edge carved in billows of uneven size (round on top, flat at the foot), its block filled with
 * one wipe of ink, one thin key line along the tops. Pure.
 */

export interface Outline { shape: P[]; tops: P[][]; holes: P[][] }

/** A bump's bulge on a top (against its length); how much longer a foot's are; the px between two points. */
const TOP_OUT = 0.34, FOOT_LONG = 2.2, STEP = 1.2

/** A mass's outlines in billows about `size(y)` px wide, with the tops for the key line; its base pressed level, or left to `hang`. */
export function billowed(grid: Grid, over: number, f: Frame, size: (y: number) => number, seed: number, hang = false): Outline[] {
  const cut = loopsIn(grid, over, f, 8).map((loop, l) => {
    const hole = areaOf(loop) < 0
    return { hole, ...carved(even(hang || hole ? loop : pressed(loop), STEP), size, seed + l * 101) }
  })
  const out = cut.filter((c) => !c.hole).map(({ shape, tops }): Outline => ({ shape, tops, holes: [] }))
  for (const { hole, shape, tops } of cut) {
    const of = hole && out.find((o) => within([o.shape], ...shape[0]))
    if (!of) continue
    of.holes.push(shape)
    of.tops.push(...tops)
  }
  return out
}

/** A loop's signed area: a mass has its inside on the right of the way, so it is over 0; a hole's is under it. */
const areaOf = (loop: readonly P[]) => loop.reduce((sum, [x, y], i) => {
  const [bx, by] = loop[(i + 1) % loop.length]
  return sum + x * by - bx * y
}, 0)

function carved(pts: readonly P[], size: (y: number) => number, seed: number): { shape: P[]; tops: P[][] } {
  const r = rng(seed), shape: P[] = [], tops: P[][] = []
  let run: P[] = []
  for (let i = 0; i < pts.length;) {
    const [x, y] = pts[i], ahead = pts[(i + 4) % pts.length], d = Math.hypot(ahead[0] - x, ahead[1] - y) || 1
    // Inside lies on the right: the way out is up where the way goes right.
    const foot = Math.max(0, -(ahead[0] - x) / d)
    const long = Math.max(2, Math.round((size(y) * (0.25 + 1.35 * r() ** 2) * (1 + FOOT_LONG * foot)) / STEP))
    const to = Math.min(pts.length, i + long)
    const b = foot > 0.3 ? pts.slice(i, to) : bump(pts[i], pts[to % pts.length], TOP_OUT * (0.55 + 0.75 * r()) * (1 - foot))
    shape.push(...b)
    if (foot <= 0.3) run.push(...b)
    else if (run.length) { tops.push(run); run = [] }
    i = to
  }
  if (run.length) tops.push(run)
  return { shape, tops }
}

/** Adds a mass, its holes open under an even-odd fill. */
function trace(ctx: Ctx2D, { shape, holes }: Outline) {
  closed(ctx, shape)
  holes.forEach((h) => closed(ctx, h))
}

/** Each mass filled whole, its ink wiped from its own top down to its foot. */
export function block(ctx: Ctx2D, loops: readonly Outline[], inks: readonly RGB[]): void {
  for (const l of loops) {
    const ys = l.shape.map((p) => p[1]), wipe = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys))
    inks.forEach((rgb, i) => wipe.addColorStop(i / (inks.length - 1), css(rgb)))
    ctx.beginPath()
    trace(ctx, l)
    ctx.fillStyle = wipe
    ctx.fill('evenodd')
  }
}

/** Keeps what `draw` lays inside the masses. */
export function inMasses(ctx: Ctx2D, loops: readonly Outline[], draw: () => void): void {
  ctx.save()
  ctx.beginPath()
  loops.forEach((l) => trace(ctx, l))
  ctx.clip('evenodd')
  draw()
  ctx.restore()
}

/** The key line along the tops of the masses. */
export function keyline(ctx: Ctx2D, loops: readonly Outline[], w: number, ink: string, seed: number): void {
  ctx.beginPath()
  loops.forEach(({ tops }, l) => tops.forEach((t, n) => carve(ctx, t, w, seed + l * 17 + n)))
  ctx.fillStyle = ink
  ctx.fill()
}

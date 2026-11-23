import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, mix, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import type { RGB } from '../../../../src/scene/model/types'
import { bump, carve, closed, even, type P } from './carve'
import { pressed } from './base'
import { loopsIn, type Frame, type Grid } from './contour'
import type { Lobe } from './lobes'

/*
 * Cloud as a print: the mass's edge carved in billows (round on top, flat at the foot), and inside it caps, each with a
 * crisp bumped top and its colour wiped away downward, so that every cap's light stands on the shade of the one behind it.
 * One thin key line along the tops. Pure.
 */

/** A cap's inks: its light, its own tone, its shade, its key line. */
export interface Inks { lit: RGB; local: RGB; shade: RGB; key: RGB }
export interface Caps { x: number; y: number; step: number; toward: number; seed: number; ink: (l: Lobe) => Inks; line: (l: Lobe) => number }
export interface Outline { shape: P[]; tops: P[][] }

/** A bump's bulge on a top (against its length); how much longer a foot's are; the px between two points. */
const TOP_OUT = 0.34, FOOT_LONG = 2.2, STEP = 1.2
/** The least height of a mass whose foot is cut (px). */
const FEET = 14
/** The undersides' depth against the mass, at most (px), and the steps of the wipe. */
const FOOT_DEEP = 0.34, FOOT_MOST = 34, WIPES = 16
const LINE = 0.62, LINE_ALPHA = 0.6

/** A mass's outline in billows about `size(y)` px wide, with its tops for the key line; its base pressed level, or left to `hang`. */
export function billowed(grid: Grid, over: number, f: Frame, size: (y: number) => number, seed: number, hang = false): Outline[] {
  return loopsIn(grid, over, f, 8).map((raw, l) => {
    const pts = even(hang ? raw : pressed(raw), STEP), r = rng(seed + l * 101), shape: P[] = [], tops: P[][] = []
    let run: P[] = []
    for (let i = 0; i < pts.length;) {
      const [x, y] = pts[i], ahead = pts[(i + 4) % pts.length], d = Math.hypot(ahead[0] - x, ahead[1] - y) || 1
      // Inside lies on the right: the way out is up where the way goes right.
      const foot = Math.max(0, -(ahead[0] - x) / d)
      const long = Math.max(2, Math.round((size(y) * (0.35 + 0.95 * r() ** 1.6) * (1 + FOOT_LONG * foot)) / STEP))
      const to = Math.min(pts.length, i + long)
      const b = foot > 0.3 ? pts.slice(i, to) : bump(pts[i], pts[to % pts.length], TOP_OUT * (0.75 + 0.5 * r()) * (1 - foot))
      shape.push(...b)
      if (foot <= 0.3) run.push(...b)
      else if (run.length) { tops.push(run); run = [] }
      i = to
    }
    if (run.length) tops.push(run)
    return { shape, tops }
  })
}

/** Each mass filled whole, its ink wiped from its own top down to its foot. */
export function block(ctx: Ctx2D, loops: readonly Outline[], inks: readonly RGB[]) {
  loops.forEach(({ shape }) => {
    const ys = shape.map((p) => p[1]), wipe = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys))
    inks.forEach((rgb, i) => wipe.addColorStop(i / (inks.length - 1), css(rgb)))
    ctx.beginPath()
    closed(ctx, shape)
    ctx.fillStyle = wipe
    ctx.fill()
  })
}

/** The undersides: ink wiped up from every edge that looks down, in a few steps, and level cuts in the lowest part. */
export function feet(ctx: Ctx2D, loops: readonly Outline[], ink: string, line: string, strength: number, seed: number, most = (_y: number) => FOOT_MOST) {
  loops.forEach(({ shape }, l) => {
    const xs = shape.map((p) => p[0]), ys = shape.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), foot = Math.max(...ys), tall = foot - Math.min(...ys)
    const r = rng(seed + l * 211), deep = Math.min(FOOT_MOST, FOOT_DEEP * tall)
    ctx.save()
    ctx.beginPath()
    closed(ctx, shape)
    ctx.clip()
    ctx.fillStyle = ink
    ctx.globalAlpha *= (1.6 * strength) / WIPES
    for (let k = 1; k <= WIPES; k++) {
      ctx.beginPath()
      ctx.rect(x0 - 9, Math.min(...ys) - deep - 9, x1 - x0 + 18, tall + 2 * deep + 18)
      closed(ctx, shape.map(([x, y]): P => [x, y - (Math.min(deep, most(y)) * k * k) / (WIPES * WIPES)]))
      ctx.fill('evenodd')
    }
    if (tall > FEET) {
      const many = Math.min(8, 2 + Math.round(tall / 22))
      ctx.fillStyle = line
      ctx.globalAlpha = Math.min(1, (ctx.globalAlpha * WIPES) / (1.6 * strength))
      ctx.beginPath()
      for (let n = 0; n < many; n++) {
        const u = n / many, y = foot - (0.05 + 0.24 * u) * Math.min(tall, 90), long = (x1 - x0) * (0.14 + 0.3 * r()) * (1 - 0.5 * u), x = x0 + r() * (x1 - x0 - long)
        carve(ctx, [0, 0.25, 0.5, 0.75, 1].map((k): P => [x + k * long, y + Math.sin(k * 3 + n) * 0.5]), 0.6, seed + n, 0.9)
      }
      ctx.fill()
    }
    ctx.restore()
  })
}

/** The key line along the tops of the masses. */
export function keyline(ctx: Ctx2D, loops: readonly Outline[], w: number, ink: string, seed: number) {
  ctx.beginPath()
  loops.forEach(({ tops }, l) => tops.forEach((t, n) => carve(ctx, t, w, seed + l * 17 + n)))
  ctx.fillStyle = ink
  ctx.fill()
}

/** A cap's top as bumps over its shoulders, left to right. */
function capTop(x: number, y: number, r: number, random: () => number): P[] {
  const many = r < 3.5 ? 2 : r < 8 ? 3 : r < 16 ? 4 + Math.floor(random() * 2) : 6 + Math.floor(random() * 2)
  const from = Math.PI * (1.04 - 0.1 * random()), to = Math.PI * (1.96 + 0.1 * random())
  const ends = Array.from({ length: many + 1 }, (_, i): P => {
    const u = (i && i < many ? i + (random() - 0.5) * 0.5 : i) / many, a = from + (to - from) * u, k = 0.86 + 0.2 * random()
    return [x + Math.cos(a) * r * 1.12 * k, y + Math.sin(a) * r * 0.9 * k]
  })
  const out: P[] = []
  for (let i = 0; i < many; i++) out.push(...bump(ends[i], ends[i + 1], 0.24 + 0.14 * random()))
  return [...out, ends[many]]
}

/** The caps, the mass's top first, so that a lower one stands before it. */
export function paintCaps(ctx: Ctx2D, lobes: readonly Lobe[], f: Caps) {
  const back = [...lobes].sort((a, b) => a.y - 0.2 * a.r - (b.y - 0.2 * b.r))
  back.forEach((l) => {
    const n = Math.round(l.x) * 31 + Math.round(l.y) * 6151
    const x = f.x + l.x * f.step, y = f.y + l.y * f.step, r = l.r * f.step, ink = f.ink(l), top = capTop(x, y, r, rng(f.seed + n))
    const [x0, y0] = top[0], [x1, y1] = top[top.length - 1], lean = f.toward * r * 0.7
    ctx.beginPath()
    top.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.bezierCurveTo(x1 - r * 0.1, y1 + r * 1.1, x0 + r * 0.1, y0 + r * 1.1, x0, y0)
    const wipe = ctx.createLinearGradient(x + lean, y - r * 1.05, x - lean, y + r * 0.75)
    wipe.addColorStop(0, css(ink.lit))
    wipe.addColorStop(0.3, css(mix(ink.lit, ink.local, 0.35)))
    wipe.addColorStop(0.62, css(mix(ink.local, ink.shade, 0.55), 0.8))
    wipe.addColorStop(1, css(ink.shade, 0))
    ctx.fillStyle = wipe
    ctx.fill()
    const line = f.line(l)
    if (line < 0.05) return
    ctx.beginPath()
    carve(ctx, top, LINE * Math.min(1.25, 0.6 + r / 26), f.seed + n)
    ctx.fillStyle = css(ink.key, LINE_ALPHA * line)
    ctx.fill()
  })
}

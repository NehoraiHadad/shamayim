import { rng } from '../../../../src/scene/paint/shared/base/core'
import { css, mix, type Ctx2D } from '../../../../src/scene/paint/shared/base/hand'
import type { RGB } from '../../../../src/scene/model/types'
import { bump, carve, type P } from './carve'
import type { Lobe } from './lobes'

/*
 * A cap: a crisp top of uneven bumps, its ink wiped away to nothing at its own foot, so that it stands on whatever is behind
 * it with no side of its own. It leans the way its mass faces. A key line here and there, seldom along all of it. Pure.
 */

/** A cap's inks: its light, its own tone, its shade, its key line. */
export interface Inks { lit: RGB; local: RGB; shade: RGB; key: RGB }
export interface Caps { x: number; y: number; step: number; seed: number; ink: (l: Lobe) => Inks; line: (l: Lobe) => number }
interface CapAt { x: number; y: number; r: number; tilt: number; seed: number; line: number }

const LINE = 0.62, LINE_ALPHA = 0.6
/** The share of caps whose line runs the whole top. */
const WHOLE = 0.35

/** A cap's top about the origin, left to right: bumps of very uneven width. */
function top(r: number, random: () => number): P[] {
  const many = r < 3.5 ? 2 : r < 8 ? 3 : r < 16 ? 3 + Math.floor(random() * 3) : 4 + Math.floor(random() * 5)
  const widths = Array.from({ length: many }, () => 0.3 + 1.7 * random() ** 2), whole = widths.reduce((a, b) => a + b, 0)
  const from = Math.PI * (0.96 + 0.06 * random()), to = Math.PI * (1.98 + 0.06 * random())
  let gone = 0
  const ends = [0, ...widths].map((w): P => {
    gone += w
    const a = from + ((to - from) * gone) / whole, k = 0.82 + 0.24 * random()
    return [Math.cos(a) * r * 1.12 * k, Math.sin(a) * r * 0.92 * k]
  })
  return ends.flatMap((p, i) => (i < many ? bump(p, ends[i + 1], 0.16 + 0.2 * random()) : [p]))
}

export function cap(ctx: Ctx2D, at: CapAt, ink: Inks): void {
  const random = rng(at.seed), { r } = at, pts = top(r, random), last = pts.length - 1
  ctx.save()
  ctx.translate(at.x, at.y)
  ctx.rotate(at.tilt)
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  // Gone at the higher end of the chord, so the chord itself never shows.
  const wipe = ctx.createLinearGradient(0, -r * 1.05, 0, Math.min(-0.1 * r, pts[0][1], pts[last][1]))
  wipe.addColorStop(0, css(ink.lit))
  wipe.addColorStop(0.35, css(mix(ink.lit, ink.local, 0.5)))
  wipe.addColorStop(0.7, css(mix(ink.local, ink.shade, 0.5), 0.75))
  wipe.addColorStop(1, css(ink.shade, 0))
  ctx.fillStyle = wipe
  ctx.fill()
  if (at.line > 0.05) {
    const cut = random() < WHOLE ? [0.06, 0.94] : [0.05 + 0.3 * random(), 0.95 - 0.35 * random()]
    ctx.beginPath()
    carve(ctx, pts.slice(Math.round(cut[0] * last), Math.round(cut[1] * last)), LINE * Math.min(1.25, 0.6 + r / 26), at.seed, 1)
    ctx.fillStyle = css(ink.key, LINE_ALPHA * at.line)
    ctx.fill()
  }
  ctx.restore()
}

/** The caps, the mass's top first, so that a lower one stands before it. */
export function paintCaps(ctx: Ctx2D, lobes: readonly Lobe[], f: Caps): void {
  const back = [...lobes].sort((a, b) => a.y - 0.2 * a.r - (b.y - 0.2 * b.r))
  for (const l of back) {
    const seed = f.seed + Math.round(l.x) * 31 + Math.round(l.y) * 6151
    cap(ctx, { x: f.x + l.x * f.step, y: f.y + l.y * f.step, r: l.r * f.step, tilt: l.tilt, seed, line: f.line(l) }, f.ink(l))
  }
}

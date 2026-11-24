import type { Pt, SeaDesc, Shine } from '../../../model/types'
import { rng } from '../../shared/base/core'
import { css, mix, type Ctx2D } from '../../shared/base/hand'
import { crest } from './waves'

/*
 * The sea's shore, along the model's own coast: shallows the sand shows through, a wet edge where the ruled line stood, and
 * thin broken foam, all wider toward the eye. Seeded, of the model's shore tone.
 */

/** A point of the coast: its direction, the way to the sea, and how near it is (0 far … 1). */
interface Stand { x: number; y: number; tx: number; ty: number; nx: number; ny: number; near: number }

/** The coast's points every few px; not where the sea runs along the picture's own edge. */
function along({ coast, points, top, bottom }: SeaDesc, step: number): Stand[] {
  const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length, cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length
  const xs = points.map(([x]) => x), ends = [Math.min(...xs), Math.max(...xs)]
  const out: Stand[] = []
  for (let i = 1; i < coast.length; i++) {
    const [ax, ay] = coast[i - 1], [bx, by] = coast[i], long = Math.hypot(bx - ax, by - ay)
    if (long < 1e-3 || ends.some((x) => Math.abs(ax - x) < 0.5 && Math.abs(bx - x) < 0.5)) continue
    const tx = (bx - ax) / long, ty = (by - ay) / long, side = -ty * (cx - ax) + tx * (cy - ay) < 0 ? -1 : 1
    for (let n = 0, many = Math.ceil(long / step); n < many; n++) {
      const u = n / many, y = ay + (by - ay) * u
      out.push({ x: ax + (bx - ax) * u, y, tx, ty, nx: -ty * side, ny: tx * side, near: Math.min(1, Math.max(0, (y - top) / Math.max(1, bottom - top))) })
    }
  }
  return out
}

/** A ribbon from `from` to `to` px off the coast (toward the sea), by how near it is. */
function ribbon(ctx: Ctx2D, at: readonly Stand[], from: (s: Stand) => number, to: (s: Stand) => number) {
  const edge = (off: (s: Stand) => number) => at.map((s): Pt => [s.x + s.nx * off(s), s.y + s.ny * off(s)])
  ctx.beginPath()
  ;[...edge(from), ...edge(to).reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fill()
}

const none = () => 0

/** The shallows, on the water (the caller keeps them to it). */
export function layShallows(ctx: Ctx2D, s: SeaDesc): void {
  const at = along(s, 6)
  ctx.fillStyle = css(mix(s.stops[s.stops.length - 1][1], s.shore, 0.45), 0.2)
  for (const wide of [6.5, 3.6, 1.6]) ribbon(ctx, at, none, ({ near }) => 0.3 + wide * near)
}

/** The wet edge and the foam, over both. */
export function layShore(ctx: Ctx2D, s: SeaDesc, shine: Shine): void {
  const at = along(s, 1.7), light = 0.7 - 0.35 * shine.night
  ctx.fillStyle = css(mix(s.shore, s.stops[s.stops.length - 1][1], 0.4), 0.3 * light)
  ribbon(ctx, at, (p) => -0.2 - 1.1 * p.near * (0.6 + 0.4 * Math.sin(p.x * 0.31)), (p) => 0.2 + 0.5 * p.near)
  const r = rng(19)
  for (const [off, share, alpha] of [[0, 0.72, 0.8], [2.4, 0.34, 0.5]] as const) {
    ctx.fillStyle = css(s.shore, alpha * light)
    ctx.beginPath()
    for (const p of at) {
      const u = r(), v = r(), w = (0.9 + 2.6 * p.near) * (0.5 + v)
      if (u > share * (0.75 + 0.35 * Math.sin(p.x * 0.17 + p.y * 0.23 + off))) continue
      const out = off * p.near + (v - 0.4) * 0.9 * p.near
      crest(ctx, p.x + p.nx * out - p.tx * w / 2, p.y + p.ny * out - p.ty * w / 2, w, 0.4 + 0.75 * p.near * (0.5 + u), p.tx, p.ty)
    }
    ctx.fill()
  }
}

import type { Ctx2D } from '../hand'

export type Pt = readonly [number, number]
export type Rand = () => number

/**
 * Cloud contours (track D). MEDIUM: an edge made of lobes, never a stamped ellipse. A frame line, the cloud's gesture, is
 * walked and broken into lobes of uneven length. Each lobe bulges outward, and a long one breaks again into smaller ones
 * on its back (two orders of cauliflower, as a convective top boils: big turrets carry small ones). A lobe's bulge goes
 * with its length, so small lobes are tight and the big ones broad. Seeded only.
 */

/** A lobed edge along `frame` (open), its bulges toward `out` (+1: left of the direction of travel, y down). */
export function lobed(frame: readonly Pt[], r: Rand, lobe: [number, number], bulge: number, out: 1 | -1, depth = 2): Pt[] {
  const pts: Pt[] = [frame[0]]
  const total = length(frame)
  let s = 0
  while (s < total - 1e-6) {
    const step = Math.min(total - s, lobe[0] + (lobe[1] - lobe[0]) * r())
    const a = at(frame, s), b = at(frame, s + step)
    arcInto(pts, a, b, r, bulge * (0.7 + 0.6 * r()), out, depth)
    s += step
  }
  return pts
}

/** One lobe from a to b, bulging by `k` × its chord, broken again into smaller ones when there is depth left. */
function arcInto(pts: Pt[], a: Pt, b: Pt, r: Rand, k: number, out: 1 | -1, depth: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return
  // The outward normal: left of a→b (y down), times `out`.
  const nx = (dy / len) * out, ny = (-dx / len) * out
  if (depth > 0 && len > 6 && r() < 0.75) {
    // The lobe's top, pushed out, carries two smaller lobes.
    const t = 0.35 + 0.3 * r()
    const top: Pt = [a[0] + dx * t + nx * len * k * 0.55, a[1] + dy * t + ny * len * k * 0.55]
    arcInto(pts, a, top, r, k * 0.85, out, depth - 1)
    arcInto(pts, top, b, r, k * 0.85, out, depth - 1)
    return
  }
  // A curve of 6 points on the quadratic a → (mid + n·bulge) → b.
  const cx = a[0] + dx / 2 + nx * len * k, cy = a[1] + dy / 2 + ny * len * k
  for (let i = 1; i <= 6; i++) {
    const t = i / 6, u = 1 - t
    pts.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]])
  }
}

function length(frame: readonly Pt[]) {
  let s = 0
  for (let i = 1; i < frame.length; i++) s += Math.hypot(frame[i][0] - frame[i - 1][0], frame[i][1] - frame[i - 1][1])
  return s
}

/** The point at arc length `s` along a polyline. */
function at(frame: readonly Pt[], s: number): Pt {
  for (let i = 1; i < frame.length; i++) {
    const [x0, y0] = frame[i - 1], [x1, y1] = frame[i]
    const seg = Math.hypot(x1 - x0, y1 - y0)
    if (s <= seg || i === frame.length - 1) {
      const t = seg > 0 ? Math.min(1, s / seg) : 0
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
    }
    s -= seg
  }
  return frame[frame.length - 1]
}

/** A frame round a heap's top: from the left foot over the crown to the right foot, the crown leaning by `lean`. */
export function crownFrame(cx: number, w: number, h: number, lean: number, flat = 2.2, n = 14): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const x = -1 + (2 * i) / n
    const y = h * (1 - Math.abs(x) ** flat) ** (1 / flat)
    out.push([cx + (x * w) / 2 + lean * y * 0.35, -y])
  }
  return out
}

/** A closed pad's frame (an underside seen in perspective, a stratocumulus element): a rounded rhomboid, not an oval. */
export function padFrame(cx: number, cy: number, w: number, h: number, r: Rand, n = 12): Pt[] {
  const out: Pt[] = []
  const skew = (r() - 0.5) * 0.3
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const c = Math.cos(a), s = Math.sin(a)
    // A superellipse (squarer than an oval), each point pulled in or out a little.
    const k = 0.88 + 0.24 * r()
    const x = Math.sign(c) * Math.abs(c) ** 0.7, y = Math.sign(s) * Math.abs(s) ** 0.8
    out.push([cx + (x + skew * y) * (w / 2) * k, cy + y * (h / 2) * k])
  }
  out.push(out[0])
  return out
}

export function trace(c: Ctx2D, pts: readonly Pt[], close = true) {
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  if (close) c.closePath()
}

export const shift = (pts: readonly Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy])

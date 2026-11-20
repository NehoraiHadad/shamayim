/*
 * Drawing helpers ported from the anidoodle skill's portable art core (`engine/src/canvas-core/core.ts`, anidoodle
 * 0.10.1, https://github.com/alexgreensh/anidoodle). Copyright 2026 Alex Greenshpun. Licensed under the Apache License,
 * Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0); the original NOTICE reads "anidoodle, Copyright 2026 Alex
 * Greenshpun. This product includes software developed as an original work, licensed under the Apache License, Version
 * 2.0." Changes from the original: typed for this codebase (readonly points), `noise2` without per-call closures (the same numbers), one seeded generator shared with the world
 * (`rng` is `data/landmarks/hash.ts`'s `seeded`, the same mulberry32), the noise table cache bounded, comments added.
 * Only the helpers the scene uses are ported (rng, fractal, sample, jitter, displace, oval, softBox, line, tube); the
 * film machinery (cues, score, Gfx, probe) is not.
 *
 * Pure: no DOM, no clock, no `Math.random`; the same seed gives the same numbers on every machine.
 */
import { seeded } from '../../data/landmarks/hash'

export type P = readonly [number, number]

/** A seeded generator in 0…1 (mulberry32): the world's `seeded`, so the world and the paint share one generator. */
export const rng = (seed: number) => seeded(seed)

/* Gradient noise, optionally periodic so a tile repeats without a seam. `fractal` mirrors SVG fractalNoise: octaves at
 * halving amplitude, mapped to 0…1. The permutation table of a seed is a pure function of it, so caching it is legal. */
interface Table { perm: Uint16Array; gx: Float32Array; gy: Float32Array }
const noiseCache = new Map<number, Table>()

function table(seed: number): Table {
  let t = noiseCache.get(seed)
  if (t) return t
  const r = rng(seed * 7919 + 13)
  const perm = new Uint16Array(512), gx = new Float32Array(256), gy = new Float32Array(256)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  for (let i = 0; i < 256; i++) {
    const a = r() * Math.PI * 2
    gx[i] = Math.cos(a)
    gy[i] = Math.sin(a)
  }
  t = { perm, gx, gy }
  if (noiseCache.size >= 256) noiseCache.clear()
  noiseCache.set(seed, t)
  return t
}

function noise2(seed: number, x: number, y: number, px = 0, py = 0): number {
  const { perm, gx, gy } = table(seed)
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  // Lattice corners, wrapped when periodic (the original's `w`), then hashed through the permutation (its `g`).
  const ix0 = (px > 0 ? ((x0 % px) + px) % px : x0) & 255, ix1 = (px > 0 ? (((x0 + 1) % px) + px) % px : x0 + 1) & 255
  const iy0 = (py > 0 ? ((y0 % py) + py) % py : y0) & 255, iy1 = (py > 0 ? (((y0 + 1) % py) + py) % py : y0 + 1) & 255
  const h00 = perm[perm[ix0] + iy0], h10 = perm[perm[ix1] + iy0], h01 = perm[perm[ix0] + iy1], h11 = perm[perm[ix1] + iy1]
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = gx[h00] * fx + gy[h00] * fy, b = gx[h10] * (fx - 1) + gy[h10] * fy
  const c = gx[h01] * fx + gy[h01] * (fy - 1), d = gx[h11] * (fx - 1) + gy[h11] * (fy - 1)
  return a + sx * (b - a) + sy * (c + sx * (d - c) - (a + sx * (b - a)))
}

/** Seeded fractal gradient noise at (x, y), frequency (fx, fy), `oct` octaves; 0…1 around 0.5. `tile` > 0: periodic. */
export function fractal(seed: number, x: number, y: number, fx: number, fy: number, oct: number, tile = 0): number {
  let sum = 0, amp = 1
  let px = tile ? Math.max(1, Math.round(fx * tile)) : 0, py = tile ? Math.max(1, Math.round(fy * tile)) : 0
  let kx = tile ? px / tile : fx, ky = tile ? py / tile : fy
  for (let o = 0; o < oct; o++) {
    sum += noise2(seed + o * 101, x * kx, y * ky, px, py) * amp
    amp *= 0.5; kx *= 2; ky *= 2; px *= 2; py *= 2
  }
  return (sum + 1) / 2
}

/** Each point moved by up to `amt` in x and y (seeded): the hand's wobble on an edge. */
export function jitter(pts: readonly P[], amt: number, seed: number): P[] {
  if (amt <= 0) return pts.slice()
  const r = rng(seed)
  return pts.map(([x, y]): P => [x + (r() - 0.5) * 2 * amt, y + (r() - 0.5) * 2 * amt])
}

/** A Catmull-Rom resampling of a polyline, `per` points per segment: a smooth line through the given points. */
export function sample(pts: readonly P[], closed = false, per = 10): P[] {
  if (pts.length < 2) return pts.slice()
  const n = pts.length
  const at = (i: number): P => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  const out: P[] = []
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t
      const c = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
        + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)
      out.push([c(0), c(1)])
    }
  }
  out.push(closed ? out[0] : pts[n - 1])
  return out
}

/** Points moved by a smooth seeded vector field: the portable stand-in for a displacement filter. */
export function displace(pts: readonly P[], amp: number, freq: number, oct: number, seed: number): P[] {
  return pts.map(([x, y]): P => [x + (fractal(seed, x, y, freq, freq, oct) - 0.5) * amp,
    y + (fractal(seed + 50, x, y, freq, freq, oct) - 0.5) * amp])
}

/** A closed ellipse of `n` points. */
export function oval(cx: number, cy: number, rx: number, ry = rx, n = 10, a0 = -1.9): P[] {
  return Array.from({ length: n }, (_, i): P => {
    const a = a0 + (i / n) * Math.PI * 2
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]
  })
}

/** A superellipse (a box with soft corners) of `n` points, `w × h` round (cx, cy). */
export function softBox(cx: number, cy: number, w: number, h: number, e = 3.2, n = 16): P[] {
  return Array.from({ length: n }, (_, i): P => {
    const a = -2.2 + (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
    const k = 1 / (Math.abs(c) ** e + Math.abs(s) ** e) ** (1 / e)
    return [cx + (c * k * w) / 2, cy + (s * k * h) / 2]
  })
}

/** A line from a to b with its middle bowed `bow` to its left: three points to `sample`. */
export function line(a: P, b: P, bow = 0): P[] {
  const nx = -(b[1] - a[1]), ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1
  return [a, [(a[0] + b[0]) / 2 + (nx / l) * bow, (a[1] + b[1]) / 2 + (ny / l) * bow], b]
}

/** A centreline → a closed outline `r0` wide at its start and `r1` at its end (a tapered stroke), capped at the end. */
export function tube(centre: readonly P[], r0: number, r1 = r0, cap = true): P[] {
  const c = sample(centre, false, 5)
  const L: P[] = [], R: P[] = []
  c.forEach((p, i) => {
    const q = c[Math.min(c.length - 1, i + 1)], o = c[Math.max(0, i - 1)]
    const dx = q[0] - o[0], dy = q[1] - o[1], len = Math.hypot(dx, dy) || 1, r = r0 + ((r1 - r0) * i) / (c.length - 1)
    L.push([p[0] - (dy / len) * r, p[1] + (dx / len) * r])
    R.push([p[0] + (dy / len) * r, p[1] - (dx / len) * r])
  })
  const e = c[c.length - 1], e0 = c[c.length - 2], ex = e[0] - e0[0], ey = e[1] - e0[1], el = Math.hypot(ex, ey) || 1
  const tip: P[] = cap ? [[e[0] + (ex / el) * r1, e[1] + (ey / el) * r1]] : []
  const thin = (a: P[]) => a.filter((_, i) => i % 3 === 0 || i === a.length - 1)
  return [...thin(L), ...tip, ...thin(R).reverse()]
}

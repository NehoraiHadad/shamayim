/*
 * The clouds' own noise, two seeded periodic tiles: `puffs` (inverted cellular noise over three octaves: round heads
 * packed together, dark creases between) and `wisps` (gradient noise over five, with no lattice to see). Both 0–1 round ½.
 * Pure: a function of the seed.
 */

export const SIDE = 256

const kept = new Map<string, Float32Array>()

function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Distance to the nearest of one jittered point a cell, `n` cells round the tile: 1 at a point, 0 a cell away. */
function cells(u: number, v: number, n: number, seed: number) {
  const x = u * n, y = v * n, i = Math.floor(x), j = Math.floor(y)
  let best = 9
  for (let b = -1; b <= 1; b++) {
    for (let a = -1; a <= 1; a++) {
      const ci = ((i + a) % n + n) % n, cj = ((j + b) % n + n) % n
      const dx = i + a + hash(ci, cj, seed) - x, dy = j + b + hash(ci, cj, seed + 71) - y
      best = Math.min(best, dx * dx + dy * dy)
    }
  }
  return 1 - Math.min(1, Math.sqrt(best))
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

function gradient(u: number, v: number, n: number, seed: number) {
  const x = u * n, y = v * n, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j
  const dot = (a: number, b: number) => {
    const angle = hash(((i + a) % n + n) % n, ((j + b) % n + n) % n, seed) * Math.PI * 2
    return Math.cos(angle) * (fx - a) + Math.sin(angle) * (fy - b)
  }
  const sx = fade(fx), sy = fade(fy)
  const top = dot(0, 0) + (dot(1, 0) - dot(0, 0)) * sx
  return top + (dot(0, 1) + (dot(1, 1) - dot(0, 1)) * sx - top) * sy
}

/** An octave sum stretched to 0–1 (its 2nd and 98th percentiles), so every seed has the same contrast. */
function tile(key: string, at: (u: number, v: number) => number): Float32Array {
  const have = kept.get(key)
  if (have) return have
  const out = new Float32Array(SIDE * SIDE)
  for (let j = 0; j < SIDE; j++) for (let i = 0; i < SIDE; i++) out[j * SIDE + i] = at(i / SIDE, j / SIDE)
  const sorted = Float32Array.from(out).sort()
  const lo = sorted[Math.floor(0.02 * out.length)], hi = sorted[Math.floor(0.98 * out.length)]
  for (let n = 0; n < out.length; n++) out[n] = Math.min(1, Math.max(0, (out[n] - lo) / (hi - lo)))
  if (kept.size > 12) kept.clear()
  kept.set(key, out)
  return out
}

export const puffTile = (seed: number) => tile(`p${seed}`, (u, v) =>
  0.58 * cells(u, v, 4, seed) + 0.28 * cells(u, v, 9, seed + 5) + 0.14 * cells(u, v, 19, seed + 9))

/** The heads' own slow swell, for the light on them: no fine octave, so it models without scratching. */
export const swellTile = (seed: number) => tile(`s${seed}`, (u, v) =>
  0.6 * cells(u, v, 5, seed) + 0.4 * gradient(u, v, 4, seed + 3) + 0.2 * gradient(u, v, 9, seed + 4))

export const wispTile = (seed: number) => tile(`w${seed}`, (u, v) => {
  let sum = 0, a = 1
  for (let o = 0, n = 4; o < 5; o++, n *= 2, a *= 0.52) sum += a * gradient(u, v, n, seed + o * 17)
  return sum
})

/** A tile at (u, v) in tile widths, bilinear and wrapped. */
export function noiseAt(t: Float32Array, u: number, v: number): number {
  const x = (u - Math.floor(u)) * SIDE, y = (v - Math.floor(v)) * SIDE
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0
  const i0 = x0 & 255, i1 = (x0 + 1) & 255, r0 = (y0 & 255) * SIDE, r1 = ((y0 + 1) & 255) * SIDE
  const a = t[r0 + i0] + (t[r0 + i1] - t[r0 + i0]) * fx
  return a + (t[r1 + i0] + (t[r1 + i1] - t[r1 + i0]) * fx - a) * fy
}

/*
 * The clouds' own noise, seeded periodic tiles: `puffs` (inverted cellular noise over three octaves: round heads packed
 * together, dark creases between), `swell` (slow) and `wisps` (gradient noise over five, with no lattice to see). Each 0–1
 * round ½, built once: one set for every cloud and plane, each reading it from its own place (`placeOf`).
 */

const SIDE = 256, SEED = 4127

const kept = new Map<string, Float32Array>()

function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Where a seed reads the tiles from, in tile widths. */
export const placeOf = (seed: number) => ({ u: hash(seed, 1, SEED), v: hash(seed, 2, SEED) })

/** A value per cell of an n×n lattice that repeats, with a cell's margin on every side. */
function lattice(n: number, at: (i: number, j: number) => number): Float32Array {
  const side = n + 3, out = new Float32Array(side * side)
  for (let j = 0; j < side; j++) for (let i = 0; i < side; i++) out[j * side + i] = at((i - 1 + n) % n, (j - 1 + n) % n)
  return out
}

/** Adds `weight` × the nearness of one jittered point a cell, `n` cells round the tile: 1 at a point, 0 a cell away; a cone,
 *  or a dome. */
function addCells(out: Float32Array, n: number, seed: number, weight: number, dome = false): void {
  const px = lattice(n, (i, j) => hash(i, j, seed)), py = lattice(n, (i, j) => hash(i, j, seed + 71)), side = n + 3
  for (let y = 0, o = 0; y < SIDE; y++) {
    const v = (y * n) / SIDE, j = v | 0, fy = v - j
    for (let x = 0; x < SIDE; x++, o++) {
      const u = (x * n) / SIDE, i = u | 0, fx = u - i
      let best = 1
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        const c = (j + 1 + b) * side + i + 1 + a, dx = a + px[c] - fx, dy = b + py[c] - fy
        best = Math.min(best, dx * dx + dy * dy)
      }
      out[o] += weight * (1 - (dome ? best : Math.sqrt(best)))
    }
  }
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/** Adds `weight` × gradient noise of `n` cells round the tile. */
function addGradient(out: Float32Array, n: number, seed: number, weight: number): void {
  const gx = lattice(n, (i, j) => Math.cos(hash(i, j, seed) * Math.PI * 2)), gy = lattice(n, (i, j) => Math.sin(hash(i, j, seed) * Math.PI * 2)), side = n + 3
  for (let y = 0, o = 0; y < SIDE; y++) {
    const v = (y * n) / SIDE, j = v | 0, fy = v - j, sy = fade(fy)
    for (let x = 0; x < SIDE; x++, o++) {
      const u = (x * n) / SIDE, i = u | 0, fx = u - i, sx = fade(fx), c = (j + 1) * side + i + 1, d = c + side
      const a = gx[c] * fx + gy[c] * fy, b = gx[c + 1] * (fx - 1) + gy[c + 1] * fy
      const e = gx[d] * fx + gy[d] * (fy - 1), f = gx[d + 1] * (fx - 1) + gy[d + 1] * (fy - 1)
      const top = a + (b - a) * sx
      out[o] += weight * (top + (e + (f - e) * sx - top) * sy)
    }
  }
}

/** An octave sum stretched to 0–1 (its 2nd and 98th percentiles). */
function tile(key: string, add: (out: Float32Array) => void): Float32Array {
  const have = kept.get(key)
  if (have) return have
  const out = new Float32Array(SIDE * SIDE)
  add(out)
  const sorted = Float32Array.from(out).sort()
  const lo = sorted[Math.floor(0.02 * out.length)], hi = sorted[Math.floor(0.98 * out.length)]
  for (let n = 0; n < out.length; n++) out[n] = Math.min(1, Math.max(0, (out[n] - lo) / (hi - lo)))
  kept.set(key, out)
  return out
}

export const puffTile = () => tile('puff', (out) => {
  addCells(out, 4, SEED, 0.58); addCells(out, 9, SEED + 5, 0.28); addCells(out, 19, SEED + 9, 0.14)
})

/** The heads' own slow swell, for the light on them: no fine octave, so it models without scratching. */
export const swellTile = () => tile('swell', (out) => {
  addCells(out, 5, SEED, 0.7, true); addCells(out, 11, SEED + 2, 0.22, true); addGradient(out, 4, SEED + 3, 0.3)
})

export const wispTile = () => tile('wisp', (out) => {
  for (let o = 0, n = 4, a = 1; o < 5; o++, n *= 2, a *= 0.52) addGradient(out, n, SEED + o * 17, a)
})

/** A tile at (u, v) in tile widths, bilinear and wrapped. */
export function noiseAt(t: Float32Array, u: number, v: number): number {
  const x = (u - Math.floor(u)) * SIDE, y = (v - Math.floor(v)) * SIDE
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0
  const i0 = x0 & 255, i1 = (x0 + 1) & 255, r0 = (y0 & 255) * SIDE, r1 = ((y0 + 1) & 255) * SIDE
  const a = t[r0 + i0] + (t[r0 + i1] - t[r0 + i0]) * fx
  return a + (t[r1 + i0] + (t[r1 + i1] - t[r1 + i0]) * fx - a) * fy
}

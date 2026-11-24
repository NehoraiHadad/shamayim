import { fractal, rng } from '../../shared/base/core'
import { keptTile, TILE } from '../../shared/base/detailTile'

/*
 * The clouds' own noise, seeded periodic tiles: `puffs` (round heads packed together, dark creases between), `swell` (the
 * heads' slow rise, for the light on them) and `wisps` (gradient noise, with no lattice to see). Each 0–1 round ½, built
 * once: one set for every cloud, each reading it from its own place (`placeOf`).
 */

const SEED = 4127

/** Where a seed reads the tiles from, in tile widths. */
export function placeOf(seed: number): { u: number; v: number } {
  const r = rng(seed ^ SEED)
  return { u: r(), v: r() }
}

/** Adds `weight` × the nearness of one jittered point a cell, `n` cells round the tile: 1 at a point, 0 a cell away. */
function addCells(out: Float32Array, n: number, seed: number, weight: number, dome = false): void {
  const r = rng(seed), px = Float32Array.from({ length: n * n }, r), py = Float32Array.from({ length: n * n }, r)
  for (let y = 0, o = 0; y < TILE; y++) {
    const v = (y * n) / TILE, j = v | 0, fy = v - j
    for (let x = 0; x < TILE; x++, o++) {
      const u = (x * n) / TILE, i = u | 0, fx = u - i
      let best = 1
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        const c = ((j + b + n) % n) * n + (i + a + n) % n, dx = a + px[c] - fx, dy = b + py[c] - fy
        best = Math.min(best, dx * dx + dy * dy)
      }
      out[o] += weight * (1 - (dome ? best : Math.sqrt(best)))
    }
  }
}

/** Adds `weight` × gradient noise of four cells round the tile, over its octaves. */
function addFractal(out: Float32Array, seed: number, octaves: number, weight: number): void {
  for (let y = 0, o = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++, o++) out[o] += weight * fractal(seed, x, y, 4 / TILE, 4 / TILE, octaves, TILE)
  }
}

/** An octave sum stretched to 0–1 (its 2nd and 98th percentiles). */
const tile = (key: string, add: (out: Float32Array) => void) => keptTile(`cloud:${key}`, (out) => {
  add(out)
  const sorted = Float32Array.from(out).sort()
  const lo = sorted[Math.floor(0.02 * out.length)], hi = sorted[Math.floor(0.98 * out.length)]
  for (let n = 0; n < out.length; n++) out[n] = Math.min(1, Math.max(0, (out[n] - lo) / (hi - lo)))
}, false)

export const puffTile = () => tile('puff', (out) => {
  addCells(out, 4, SEED, 0.58)
  addCells(out, 9, SEED + 5, 0.28)
  addCells(out, 19, SEED + 9, 0.14)
})

export const swellTile = () => tile('swell', (out) => {
  addCells(out, 5, SEED, 0.7, true)
  addCells(out, 11, SEED + 2, 0.22, true)
  addFractal(out, SEED + 3, 1, 0.3)
})

export const wispTile = () => tile('wisp', (out) => addFractal(out, SEED, 4, 1))

const WRAP = TILE - 1

/** A tile at (u, v) in tile widths, bilinear and wrapped: `tileAt` without its divisions, as it is read for every pixel. */
export function noiseAt(tile: Float32Array, u: number, v: number): number {
  const x = (u - Math.floor(u)) * TILE, y = (v - Math.floor(v)) * TILE
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0
  const left = x0 & WRAP, right = (x0 + 1) & WRAP, row = (y0 & WRAP) * TILE, next = ((y0 + 1) & WRAP) * TILE
  const a = tile[row + left] + (tile[row + right] - tile[row + left]) * fx
  return a + (tile[next + left] + (tile[next + right] - tile[next + left]) * fx - a) * fy
}

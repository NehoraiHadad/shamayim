import { fractal } from './core'

/* The clouds' fine grain: a seeded, periodic fractal tile, shared by the sheets, the towers and the curtains. Pure: a function of its seed. */

/** Detail tile side, in tile cells; octaves of the fractal noise in it (the sheets' full grain). */
export const TILE = 128
const OCTAVES = 4
/** Every tile made, by its seed and kind. */
export const tiles = new Map<string, Float32Array>()

/** The seed's periodic fractal detail, TILE × TILE, 0…1 around ½. */
export function detailTile(seed: number, octaves = OCTAVES): Float32Array {
  const key = `${seed}:${octaves}`
  let tile = tiles.get(key)
  if (tile) return tile
  tile = new Float32Array(TILE * TILE)
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) tile[y * TILE + x] = fractal(seed, x, y, 4 / TILE, 4 / TILE, octaves, TILE)
  }
  if (tiles.size >= 16) tiles.clear()
  tiles.set(key, tile)
  return tile
}

/** The tile at (u, v) in tile widths, bilinear and wrapped. */
export function tileAt(tile: Float32Array, u: number, v: number): number {
  const x = (((u * TILE) % TILE) + TILE) % TILE, y = (((v * TILE) % TILE) + TILE) % TILE
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = (x0 + 1) % TILE, y1 = (y0 + 1) % TILE
  const fx = x - x0, fy = y - y0
  const top = tile[y0 * TILE + x0] + (tile[y0 * TILE + x1] - tile[y0 * TILE + x0]) * fx
  return top + (tile[y1 * TILE + x0] + (tile[y1 * TILE + x1] - tile[y1 * TILE + x0]) * fx - top) * fy
}

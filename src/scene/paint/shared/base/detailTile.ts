import { fractal } from './core'

/* The clouds' fine grain: a seeded, periodic fractal tile, shared by the sheets, the towers and the curtains. Pure: a function of its seed. */

/** Detail tile side, in tile cells; octaves of the fractal noise in it (the sheets' full grain). */
export const TILE = 128
const OCTAVES = 4
/** Tiles kept before the cache is emptied. */
const KEPT = 16
const tiles = new Map<string, Float32Array>()

/**
 * The tile a key names (its seed and kind), made once and kept by every caller together. A full cache is emptied as a tile
 * of noise comes in; `capped` false adds past the cap.
 */
export function keptTile(key: string, fill: (tile: Float32Array) => void, capped = true): Float32Array {
  const kept = tiles.get(key)
  if (kept) return kept
  const tile = new Float32Array(TILE * TILE)
  fill(tile)
  if (capped && tiles.size >= KEPT) tiles.clear()
  tiles.set(key, tile)
  return tile
}

/** The seed's periodic fractal detail, TILE × TILE, 0…1 around ½. */
export function detailTile(seed: number, octaves = OCTAVES): Float32Array {
  return keptTile(`${seed}:${octaves}`, (tile) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) tile[y * TILE + x] = fractal(seed, x, y, 4 / TILE, 4 / TILE, octaves, TILE)
    }
  })
}

/** The tile at (u, v) in tile widths, bilinear and wrapped. */
export function tileAt(tile: Float32Array, u: number, v: number): number {
  const x = (((u * TILE) % TILE) + TILE) % TILE, y = (((v * TILE) % TILE) + TILE) % TILE
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = (x0 + 1) % TILE, y1 = (y0 + 1) % TILE
  const fx = x - x0, fy = y - y0
  const top = tile[y0 * TILE + x0] + (tile[y0 * TILE + x1] - tile[y0 * TILE + x0]) * fx
  return top + (tile[y1 * TILE + x0] + (tile[y1 * TILE + x1] - tile[y1 * TILE + x0]) * fx - top) * fy
}

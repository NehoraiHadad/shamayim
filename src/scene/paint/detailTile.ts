import { fractal, rng } from './core'

/* The clouds' fine grain: a seeded, periodic fractal tile, shared by the sheets and the towers. Pure: a function of its seed. */

/** Detail tile side, in tile cells; octaves of the fractal noise in it (the sheets' full grain). */
const TILE = 128, OCTAVES = 4
const tiles = new Map<string, Float32Array>()

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

/** Domes per tile side: a cauliflower's heads, and the smaller ones on them; how much the smaller ones weigh. */
const DOMES = 7, SMALL_DOMES = 17, SMALL = 0.45

/** The seed's periodic field of domes, TILE × TILE, about 0: rounded heads that meet in sharp creases (cauliflower). */
export function domeTile(seed: number): Float32Array {
  const key = `${seed}:domes`
  let tile = tiles.get(key)
  if (tile) return tile
  tile = new Float32Array(TILE * TILE)
  for (const [per, weight] of [[DOMES, 1], [SMALL_DOMES, SMALL]] as const) addDomes(tile, rng(seed + per), per, weight)
  const mean = tile.reduce((s, v) => s + v, 0) / tile.length
  for (let n = 0; n < tile.length; n++) tile[n] -= mean
  tiles.set(key, tile)
  return tile
}

function addDomes(tile: Float32Array, random: () => number, per: number, weight: number) {
  const domes = Array.from({ length: per * per }, () => ({ x: 0.15 + 0.7 * random(), y: 0.15 + 0.7 * random(), r: 0.75 + 0.3 * random() }))
  for (let j = 0; j < TILE; j++) {
    for (let i = 0; i < TILE; i++) {
      const x = ((i + 0.5) / TILE) * per, y = ((j + 0.5) / TILE) * per
      let high = 0
      for (let n = 0; n < 9; n++) {
        const cx = Math.floor(x) + (n % 3) - 1, cy = Math.floor(y) + Math.floor(n / 3) - 1
        const dome = domes[((cy + per) % per) * per + ((cx + per) % per)]
        const ox = x - cx - dome.x, oy = y - cy - dome.y
        high = Math.max(high, 1 - (ox * ox + oy * oy) / (dome.r * dome.r))
      }
      tile[j * TILE + i] += weight * Math.sqrt(high)
    }
  }
}

/** The tile at (u, v) in tile widths, bilinear and wrapped. */
export function tileAt(tile: Float32Array, u: number, v: number): number {
  const x = (((u * TILE) % TILE) + TILE) % TILE, y = (((v * TILE) % TILE) + TILE) % TILE
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = (x0 + 1) % TILE, y1 = (y0 + 1) % TILE
  const fx = x - x0, fy = y - y0
  const top = tile[y0 * TILE + x0] + (tile[y0 * TILE + x1] - tile[y0 * TILE + x0]) * fx
  return top + (tile[y1 * TILE + x0] + (tile[y1 * TILE + x1] - tile[y1 * TILE + x0]) * fx - top) * fy
}

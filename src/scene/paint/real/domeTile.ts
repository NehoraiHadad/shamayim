import { rng } from '../shared/base/core'
import { keptTile, TILE } from '../shared/base/detailTile'

/** Domes per tile side: a cauliflower's heads, and the smaller ones on them; how much the smaller ones weigh. */
const DOMES = 7, SMALL_DOMES = 17, SMALL = 0.45

/** The seed's periodic field of domes, TILE × TILE, about 0: rounded heads that meet in sharp creases (cauliflower). */
export function domeTile(seed: number): Float32Array {
  return keptTile(`${seed}:domes`, (tile) => {
    for (const [per, weight] of [[DOMES, 1], [SMALL_DOMES, SMALL]] as const) addDomes(tile, rng(seed + per), per, weight)
    const mean = tile.reduce((s, v) => s + v, 0) / tile.length
    for (let n = 0; n < tile.length; n++) tile[n] -= mean
  }, false)
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

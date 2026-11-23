import { smoothstep } from '../../../domain/smoothstep'
import { rng } from '../shared/base/core'
import { detailTile, tileAt } from '../shared/base/detailTile'

/*
 * The drawn hand's cloud puffs (v1b's `cloudBank`: ellipses laid back to front, each lit on its top): a seeded, periodic
 * tile of them, with broad banks of the same. Every point carries how high it stands in its puff (the silhouette grows by
 * it) and its light (+ on the puff's lit top, − at its shaded foot, where the next one in front begins). Pure: the seed.
 */

/** Tile side (its interpolation cells are `detailTile`'s). */
const TILE = 128, TILE_SEED = 12_139
/** Puffs per tile across and down; their radius against a cell, and the share of cells left empty. */
const ACROSS = 6, DOWN = 8, RADIUS = [0.62, 1.15], EMPTY = 0.18
/** A puff's soft rim: the share of its radius it fades over. */
const RIM = 0.3
/** A puff's light down its height: lit to here, then falling to the shade at its foot. */
const FOOT = -0.75
/** A tile's width and height on the sky (px) for the puffs; the banks' and the small heads' against theirs. */
const TILE_W = 430, TILE_H = 410, BANK = 2.3, SMALL = 0.43
/** How far a slow noise bends the rows (tile widths), and how much it swells and calms the puffs. */
const BEND = 0.1, UNEVEN = 1

interface Tiles { high: Float32Array; light: Float32Array }
let made: Tiles | null = null

/** The one tile every cloud reads (each from its own place in it): made once. */
function puffTiles(): Tiles {
  if (made) return made
  const random = rng(TILE_SEED)
  const puffs = Array.from({ length: ACROSS * DOWN }, () => ({ x: random(), y: random(), r: RADIUS[0] + (RADIUS[1] - RADIUS[0]) * random(),
    off: random() < EMPTY, lit: 0.6 + 0.4 * random() }))
  const high = new Float32Array(TILE * TILE), light = new Float32Array(TILE * TILE)
  for (let n = 0; n < TILE * TILE; n++) {
    const x = (((n % TILE) + 0.5) / TILE) * ACROSS, y = ((Math.floor(n / TILE) + 0.5) / TILE) * DOWN
    const near: { y: number; dx: number; dy: number; lit: number }[] = []
    for (let j = -2; j <= 2; j++) {
      for (let i = -2; i <= 2; i++) {
        const cx = Math.floor(x) + i, cy = Math.floor(y) + j
        const puff = puffs[((cy + DOWN) % DOWN) * ACROSS + ((cx + ACROSS) % ACROSS)]
        const dx = (x - cx - puff.x) / puff.r, dy = (y - cy - puff.y) / puff.r
        if (!puff.off && dx * dx + dy * dy < 1) near.push({ y: cy + puff.y, dx, dy, lit: puff.lit })
      }
    }
    // Back to front: the lower a puff's middle, the nearer it lies over the others.
    near.sort((a, b) => a.y - b.y)
    for (const p of near) {
      const d = Math.sqrt(p.dx * p.dx + p.dy * p.dy), over = smoothstep(1, 1 - RIM, d)
      const facing = p.dy < 0 ? -p.dy * p.lit : FOOT * p.dy
      high[n] += (Math.sqrt(1 - d * d) - high[n]) * over
      light[n] += (facing - light[n]) * over
    }
  }
  made = { high: level(high), light: level(light) }
  return made
}

/** A tile about 0. */
function level(tile: Float32Array): Float32Array {
  const mean = tile.reduce((sum, v) => sum + v, 0) / tile.length
  return tile.map((v) => v - mean)
}

/** `small` is the height of the small heads that break a lone puff's outline. */
export interface Billow { high: number; light: number; small: number }

/** The puffs at (x, y) sky px: their height (the silhouette) and their light, about 0 (the returned object is reused). */
export function billows(seed: number): (x: number, y: number) => Billow {
  const { high, light } = puffTiles(), slow = detailTile(TILE_SEED, 2)
  const du = (seed % 887) / 887, dv = (seed % 541) / 541
  const out: Billow = { high: 0, light: 0, small: 0 }
  return (x, y) => {
    const u = x / TILE_W + du, v = y / TILE_H + dv
    const bend = tileAt(slow, u * 0.55, v * 0.55) - 0.5
    const pu = u + BEND * bend, pv = v - BEND * bend, bu = u / BANK + 0.43, bv = v / BANK + 0.19 + BEND * bend
    const swell = Math.max(0.15, 1 + UNEVEN * 2 * bend)
    out.high = 0.6 * tileAt(high, bu, bv) + 0.5 * swell * tileAt(high, pu, pv)
    const su = pu / SMALL + 0.31, sv = pv / SMALL + 0.67
    out.light = 0.6 * tileAt(light, bu, bv) + 0.6 * swell * tileAt(light, pu, pv) + 0.13 * (2 - swell) * tileAt(light, su, sv)
    out.small = tileAt(high, su, sv)
    return out
  }
}

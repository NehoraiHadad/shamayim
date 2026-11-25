import { fractal } from '../../shared/base/core'
import type { Box } from '../../../model/types'
import type { Ctx2D, PaintEnv, Scratch } from '../../shared/base/hand'
import type { Tier } from './lines'

/*
 * The wood in a flat: the plank's growth rings (long wavy streaks along it, unevenly spaced) and the goma-zuri speckle
 * where the baren pressed the sheet harder, multiplied into a printed block a few per cent at most. One grey tile, built
 * once from seeded tileable noise and kept; laid in the scene's own px, so it stays on the land when the view or the light
 * moves. Each block is its own plank: the tile is laid at its own place in every block. Pure: no clock, no filter.
 */

/** The tile (its px); how much of a block's value the darkest of it takes, and how large a tile px is (CSS px), by tier. */
const TILE = 256, SEED = 9137
const GRAIN: Readonly<Record<Tier, { dark: number; px: number }>> = {
  near: { dark: 0.045, px: 0.75 }, far: { dark: 0.025, px: 0.5 }, back: { dark: 0, px: 0.5 },
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const tiles = new Map<number, Scratch>()

/** The tile: white where the block prints full, greyer along the rings and in the speckle. Its pixels are the seed's alone. */
function tileOf(env: PaintEnv): Scratch {
  const held = tiles.get(SEED)
  if (held) return held
  const tile = env.canvas(TILE, TILE), img = tile.ctx.createImageData(TILE, TILE), d = img.data
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    // Rings: a few to the tile's height, bent by a slow warp and spaced unevenly; the plank runs along x.
    const warp = (fractal(SEED, x, y, 1 / 128, 1 / 64, 2, TILE) - 0.5) * 30
    const ring = Math.sin(((y + warp) / TILE) * Math.PI * 2 * 14 + (fractal(SEED + 1, x, y, 1 / 256, 1 / 32, 2, TILE) - 0.5) * 9)
    const fleck = fractal(SEED + 2, x, y, 1 / 3, 1 / 3, 1, TILE), cloud = fractal(SEED + 3, x, y, 1 / 64, 1 / 64, 2, TILE)
    const v = clamp((ring - 0.5) * 2) * 0.55 * (0.6 + 0.8 * cloud) + clamp((fleck - 0.66) * 6) * 0.9 + 0.15 * cloud
    const p = (y * TILE + x) * 4, grey = Math.round(255 * (1 - clamp(v)))
    d[p] = d[p + 1] = d[p + 2] = grey
    d[p + 3] = 255
  }
  tile.ctx.putImageData(img, 0, 0)
  tiles.set(SEED, tile)
  return tile
}

/** Multiplies the grain into what is drawn within the current clip (and `shapes`, if given): block `block` of a plane. */
export type Grain = (ctx: Ctx2D, bounds: Box, shapes: Path2D | null, block: number) => void

/** The grain of a tier's blocks, or none (the back plane, or a hand with no scratch canvas). */
export function printGrain(env: PaintEnv, tier: Tier): Grain | undefined {
  const { dark, px } = GRAIN[tier]
  if (dark <= 0 || typeof env.canvas !== 'function') return undefined
  const tile = tileOf(env)
  return (ctx, { x, y, w, h }, shapes, block) => {
    const pattern = ctx.createPattern(tile.canvas as CanvasImageSource, 'repeat')
    if (!pattern) return
    // Each block's plank lies at its own place in the tile (tile px), anchored to the scene's origin.
    const ox = (block * 97) % TILE, oy = (block * 61) % TILE
    ctx.save()
    if (shapes) ctx.clip(shapes)
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = dark
    ctx.fillStyle = pattern
    ctx.scale(px, px)
    ctx.translate(-ox, -oy)
    ctx.fillRect(x / px + ox, y / px + oy, w / px, h / px)
    ctx.restore()
  }
}

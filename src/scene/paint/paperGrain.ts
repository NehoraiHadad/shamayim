import { seeded } from '../../data/landmarks/hash'
import type { Box } from '../model/types'
import type { Ctx2D, PaintEnv } from './hand'

const TILE = 64

/** Finishing paper tooth in one-CSS-pixel cells, independent of the material texel size. */
export function paintPaperGrain(ctx: Ctx2D, bounds: Box, seed: number, amount: number, env: PaintEnv) {
  if (amount <= 0) return
  const tile = env.canvas(TILE, TILE)
  const ink = tile.ctx.createImageData(TILE, TILE)
  const random = seeded(seed)
  for (let i = 0; i < ink.data.length; i += 4) {
    const value = random() * 2 - 1
    ink.data[i] = ink.data[i + 1] = ink.data[i + 2] = value < 0 ? 0 : 255
    ink.data[i + 3] = Math.round(Math.abs(value) * 8 * amount)
  }
  tile.ctx.putImageData(ink, 0, 0)
  const pattern = ctx.createPattern(tile.canvas as CanvasImageSource, 'repeat')
  if (pattern) {
    ctx.fillStyle = pattern
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
    if (env.shade) {
      env.shade.fillStyle = pattern
      env.shade.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
    }
  }
}

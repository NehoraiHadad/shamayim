import type { LayerOf } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'

/** The sky's gradient over its bounds (C6 adds the glow and the horizon band). */
export function paintSky(ctx: Ctx2D, desc: LayerOf<'sky'>, _env: PaintEnv): void {
  const { x, y, w, h } = desc.bounds
  const gradient = ctx.createLinearGradient(0, y, 0, y + h)
  for (const [at, rgb] of desc.stops) gradient.addColorStop(Math.min(1, Math.max(0, at)), css(rgb))
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, w, h)
}

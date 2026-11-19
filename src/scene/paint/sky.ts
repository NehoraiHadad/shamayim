import type { LayerOf } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'

/**
 * The sky's gradient over its bounds, and the haze band at the horizon: rising from nothing to its strength at eye
 * level and thinning just below it, behind the far land (C6 adds the glow).
 */
export function paintSky(ctx: Ctx2D, desc: LayerOf<'sky'>, _env: PaintEnv): void {
  const { x, y, w, h } = desc.bounds
  const gradient = ctx.createLinearGradient(0, y, 0, y + h)
  for (const [at, rgb] of desc.stops) gradient.addColorStop(Math.min(1, Math.max(0, at)), css(rgb))
  ctx.fillStyle = gradient
  ctx.fillRect(x, y, w, h)
  const band = desc.band
  if (!band) return
  const top = Math.max(y, band.y - band.h), bottom = Math.min(y + h, band.y + band.h * 0.3)
  if (bottom <= top) return
  const haze = ctx.createLinearGradient(0, band.y - band.h, 0, band.y + band.h * 0.3)
  haze.addColorStop(0, css(band.rgb, 0))
  haze.addColorStop(0.45, css(band.rgb, band.alpha * 0.35))
  haze.addColorStop(1 / 1.3, css(band.rgb, band.alpha))
  haze.addColorStop(1, css(band.rgb, band.alpha * 0.4))
  ctx.fillStyle = haze
  ctx.fillRect(x, top, w, bottom - top)
}

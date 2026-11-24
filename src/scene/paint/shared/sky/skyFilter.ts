import type { LayerOf } from '../../../model/types'
import type { Ctx2D } from '../base/hand'

export function paintSkyFilter(ctx: Ctx2D, { bounds, horizon, stops }: LayerOf<'skyFilter'>): void {
  const { x, y, w, h } = bounds
  const fill = ctx.createLinearGradient(x, y, x, y + horizon)
  for (const [row, rgb] of stops) {
    fill.addColorStop(row, `color(srgb ${rgb.join(' ')})`)
  }
  ctx.fillStyle = fill
  ctx.fillRect(x, y, w, h)
}

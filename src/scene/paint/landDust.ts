import type { LayerOf } from '../model/types'
import { mix, type Ctx2D } from './hand'
import { soft } from './weather'

/** Broken pigment over the ground, with a lighter, ragged upper edge. Tile wraps both ways. */
export function paintLandDust(ctx: Ctx2D, desc: LayerOf<'landDust'>): void {
  const { w, h } = desc.bounds
  const rimRgb = mix(desc.rgb, [1, 0.91, 0.72], 0.25)
  for (const puff of desc.puffs) {
    for (const dy of [-h, 0, h]) {
      const y = puff.y + dy
      if (y + puff.ry < 0 || y - 2 * puff.ry > h) continue
      for (const dx of [-w, 0, w]) {
        const x = puff.x + dx
        if (x + puff.rx < 0 || x - puff.rx > w) continue
        soft(ctx, x, y, puff.rx, puff.ry, desc.rgb, puff.alpha)
        soft(ctx, x - puff.rx * 0.17, y - puff.ry * 0.6, puff.rx * 0.66, puff.ry * 0.58, rimRgb, puff.alpha * 0.5)
      }
    }
  }
}

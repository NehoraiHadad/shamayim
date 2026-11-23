import type { LayerOf, MistBandDesc } from '../../../model/types'
import { css, type Ctx2D, type PaintEnv } from '../base/hand'
import { soft } from '../base/softEllipse'

/** Mist lying level: its body fading in at its top, the soft puffs along the top (wrapping round the tile). */
export function paintMist(ctx: Ctx2D, desc: LayerOf<'mist'>, _env: PaintEnv): void {
  mistBands(ctx, desc.bands, desc.bounds)
}

/** Bands of mist over a tile `bounds` wide (C7's mist, C8's loading bank): each body, then the puffs along its top. */
export function mistBands(ctx: Ctx2D, bands: readonly MistBandDesc[], bounds: { x: number; w: number }) {
  const { x: bx, w } = bounds
  for (const band of bands) {
    const g = ctx.createLinearGradient(0, band.top - band.fade, 0, band.bottom)
    const span = Math.max(1, band.bottom - (band.top - band.fade))
    g.addColorStop(0, css(band.rgb, 0))
    g.addColorStop(Math.min(0.95, (2 * band.fade) / span), css(band.rgb, band.alpha * 0.75))
    g.addColorStop(1, css(band.rgb, band.alpha))
    ctx.fillStyle = g
    ctx.fillRect(bx, band.top - band.fade, w, span)
    for (const p of band.puffs) {
      for (const dx of [-w, 0, w]) {
        const x = bx + p.x + dx
        if (x + p.rx < bx || x - p.rx > bx + w) continue
        soft(ctx, x, p.y, p.rx, p.ry, band.rgb, band.alpha * p.alpha * 0.8, true)
      }
    }
  }
}

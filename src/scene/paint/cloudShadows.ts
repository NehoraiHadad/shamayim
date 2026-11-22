import type { LayerOf } from '../model/types'
import { css, type Ctx2D } from './hand'

/*
 * A cloud's shadows on a band of the land (`model/cloudShadows.ts`). MEDIUM: soft washes of the sky-lit dark, each a
 * radial falloff squashed into the ground's foreshortened ellipse (no filter), a body and two lobes. ORDER: the patches
 * (each also a period to either side, so the tile repeats without a seam), then the band's fade where it meets the next
 * (`destination-in` with a vertical ramp). The surface lays it `source-atop` the land. Pure: the patches are the model's.
 */
export function paintCloudShadow(ctx: Ctx2D, desc: LayerOf<'cloudShadow'>): void {
  const { blobs, rgb } = desc
  const period = desc.bounds.w
  const band: { top: number; bottom: number; fadeIn: [number, number] | null; fadeOut: [number, number] | null } =
    { top: 0, bottom: desc.bounds.h, fadeIn: null, fadeOut: null }
  for (const b of blobs) {
    for (const x of [b.x]) {
      if (x + b.rx < 0 || x - b.rx > period) continue
      ctx.save()
      ctx.translate(x, b.y)
      ctx.scale(1, b.ry / b.rx)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.rx)
      g.addColorStop(0, css(rgb, b.alpha))
      g.addColorStop(0.5, css(rgb, b.alpha * 0.85))
      g.addColorStop(1, css(rgb, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, b.rx, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
  if (!band.fadeIn && !band.fadeOut) return
  // The band's window: up from nothing over `fadeIn`, down to nothing over `fadeOut` (the next band takes over).
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  const g = ctx.createLinearGradient(0, band.top, 0, band.bottom)
  const at = (y: number) => Math.min(1, Math.max(0, (y - band.top) / Math.max(1e-6, band.bottom - band.top)))
  if (band.fadeIn) { g.addColorStop(at(band.fadeIn[0]), 'rgb(0 0 0 / 0)'); g.addColorStop(at(band.fadeIn[1]), 'rgb(0 0 0)') }
  else g.addColorStop(0, 'rgb(0 0 0)')
  if (band.fadeOut) { g.addColorStop(at(band.fadeOut[0]), 'rgb(0 0 0)'); g.addColorStop(at(band.fadeOut[1]), 'rgb(0 0 0 / 0)') }
  else g.addColorStop(1, 'rgb(0 0 0)')
  ctx.fillStyle = g
  ctx.fillRect(-1, band.top - 1, period + 2, band.bottom - band.top + 2)
  ctx.restore()
}

import type { LayerOf } from '../model/types'
import { css, type Ctx2D } from './hand'

/*
 * The field's cloud shadows on one land plane (`model/cloudShadowLayers.ts`). MEDIUM: soft washes of the sky-lit dark,
 * each a radial falloff squashed into the ground's foreshortened ellipse (no filter): a dense core (the umbra under the
 * cell's thick middle) easing to nothing at the rim (the penumbra of the sun's 0.53° disc and the cell's thinning edge).
 * The blobs alone: the surface lays them carried by the wind (`Advect`), clipped to the plane's ground as it lays them
 * (its own face, minus every nearer plane's face: `compose/advect.ts`, `shadowClip.ts`), `source-atop` the land, so the
 * ridges stay where they stand while the shadows cross them. Pure: every number is the model's.
 */
export function paintCloudShadow(ctx: Ctx2D, desc: LayerOf<'cloudShadow'>): void {
  const { blobs, rgb, bounds } = desc
  if (!blobs.length) return
  for (const b of blobs) {
    if (b.x + b.rx < 0 || b.x - b.rx > bounds.w || b.alpha <= 0) continue
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.scale(1, b.ry / b.rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.rx)
    g.addColorStop(0, css(rgb, b.alpha))
    g.addColorStop(0.45, css(rgb, b.alpha * 0.9))
    g.addColorStop(0.8, css(rgb, b.alpha * 0.35))
    g.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, b.rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

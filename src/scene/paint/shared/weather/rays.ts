import type { LayerOf } from '../../../model/types'
import { css, type Ctx2D } from '../base/hand'

/**
 * Rays (C7, C9): lit and shadowed wedges fanning from their point (the sun, or the point opposite it), each fading out
 * along its length, soft-edged; a corona's fine lit rays brightest near the disc.
 */
export function paintRays(ctx: Ctx2D, desc: LayerOf<'rays'>): void {
  const { x, y, reach } = desc
  for (const ray of desc.rays) {
    const rgb = ray.lit ? desc.rgb : desc.shade
    const g = ctx.createRadialGradient(x, y, reach * 0.08, x, y, reach)
    g.addColorStop(0, css(rgb, 0))
    if (desc.look === 'corona') {
      // Glare: brightest just off the limb, gone within its short reach.
      g.addColorStop(0.18, css(rgb, ray.alpha * 0.16))
      g.addColorStop(0.45, css(rgb, ray.alpha * 0.05))
    } else {
      g.addColorStop(0.15, css(rgb, ray.alpha * (ray.lit ? 0.11 : 0.12)))
      g.addColorStop(0.5, css(rgb, ray.alpha * (ray.lit ? 0.06 : 0.07)))
    }
    g.addColorStop(1, css(rgb, 0))
    ctx.fillStyle = g
    for (const k of [1, 0.6]) {
      const a0 = ray.angle - (ray.width * k) / 2, a1 = ray.angle + (ray.width * k) / 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.sin(a0) * reach, y - Math.cos(a0) * reach)
      ctx.lineTo(x + Math.sin(a1) * reach, y - Math.cos(a1) * reach)
      ctx.closePath()
      ctx.fill()
    }
  }
}

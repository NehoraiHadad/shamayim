import type { LayerOf } from '../model/types'
import { css, type Ctx2D, type PaintEnv } from './hand'

/*
 * The rainbow and the halo in the hand (C10): each colour band a soft stroke along its traced arc, its alpha varying along
 * it (the rain's presence, the ground's foot), laid with `lighter` so the bands add like light; the sky inside the primary
 * a shade brighter; the sun dogs soft patches, red on their sun side, with a short white tail outward.
 */

export function paintBow(ctx: Ctx2D, desc: LayerOf<'bow'>, _env: PaintEnv): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (desc.inner) {
    // The brighter disc inside the bow: a soft stroke along a smaller circle, wide.
    ctx.strokeStyle = css([1, 1, 1], desc.inner.alpha * 0.5)
    ctx.lineWidth = 18
    ctx.beginPath()
    desc.inner.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'lighter'
  for (const arc of desc.arcs) {
    for (let i = 1; i < arc.points.length; i++) {
      const a = (arc.alphas[i - 1] + arc.alphas[i]) / 2
      if (a < 0.005) continue
      const [x0, y0] = arc.points[i - 1], [x1, y1] = arc.points[i]
      if (Math.abs(x1 - x0) > 60) continue
      // Soft: a wide faint pass under a narrower one.
      ctx.strokeStyle = css(arc.rgb, a * 0.35)
      ctx.lineWidth = arc.width * 2.2
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
      ctx.strokeStyle = css(arc.rgb, a * 0.6)
      ctx.lineWidth = arc.width
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
    }
  }
  for (const d of desc.dogs) {
    const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r)
    g.addColorStop(0, css([1, 0.95, 0.85], d.alpha * 0.8))
    g.addColorStop(0.5, css([1, 0.7, 0.5], d.alpha * 0.35))
    g.addColorStop(1, css([1, 0.7, 0.5], 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(d.x, d.y, d.r * 0.7, d.r * 1.25, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

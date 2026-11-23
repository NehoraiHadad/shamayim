import { smoothstep } from '../../../../domain/smoothstep'
import { css, type Ctx2D } from './hand'

/** A soft ellipse: a radial gradient squashed by the transform (no filter). */
export function soft(ctx: Ctx2D, x: number, y: number, rx: number, ry: number, rgb: readonly [number, number, number],
  alpha: number, fadesWithLight = false) {
  if (rx <= 0 || ry <= 0 || (!fadesWithLight && alpha <= 0.003)) return
  const opacity = fadesWithLight ? alpha * smoothstep(0, 0.006, alpha) : alpha
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, css(rgb, opacity))
  g.addColorStop(0.55, css(rgb, opacity * 0.55))
  g.addColorStop(1, css(rgb, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

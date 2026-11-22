import { css, mix, type Ctx2D } from '../hand'
import { lobed, padFrame, trace, type Rand } from './contour'
import type { CloudSprite } from './sprite'

/*
 * Stratocumulus and stratus elements (track D, SPEC §6), after J. C. Dahl's Dresden cloud studies (1820s) and the WMO Sc
 * stratiformis plates. Sc: rounded pads seen from below, grey and dark in their thick middle, luminous where they thin
 * at the joints. The tops barely modelled. Far off they flatten into bars. Stratus: the same pad, flatter, edges lost.
 * Order of marks: the pad's body, its dark heart (the thick middle), a lit top toward the source, then (Sc) a seam of
 * two or three lobes inside it where the pad's rolls meet.
 */
export function paintPad(c: Ctx2D, s: CloudSprite, r: Rand): void {
  const h = Math.max(1.5, s.under + s.tall)
  const cy = s.under - h / 2
  const stratus = s.genus === 'st'
  const edge = lobed(padFrame(0, cy, s.w, h, r, 14), r, [s.w * 0.06, s.w * (stratus ? 0.3 : 0.16)], stratus ? 0.08 : 0.2, -1, stratus ? 0 : 2)
  trace(c, edge)
  c.fillStyle = css(s.body)
  c.fill()
  c.save()
  c.globalCompositeOperation = 'source-atop'
  // The thick middle: darker as the element is thicker (its τ), the joints left light.
  const heart = mix(s.body, s.shade, 0.25 + 0.6 * (1 - Math.exp(-s.tau / 15)))
  const g = c.createRadialGradient(0, cy + h * 0.15, 0, 0, cy + h * 0.15, s.w * 0.5)
  g.addColorStop(0, css(heart))
  g.addColorStop(0.55, css(heart, 0.7))
  g.addColorStop(1, css(heart, 0))
  c.save()
  c.translate(0, cy)
  c.scale(1, h / s.w)
  c.translate(0, -cy)
  c.fillStyle = g
  c.fillRect(-s.w, cy - s.w, 2 * s.w, 2 * s.w)
  c.restore()
  // The side toward the light catches it on the pad's upper edge.
  if (s.toward && s.litA > 0.02) {
    const [tx, ty] = s.toward
    const lg = c.createLinearGradient(tx * s.w * 0.5, cy + ty * h * 0.6, -tx * s.w * 0.2, cy - ty * h * 0.2)
    lg.addColorStop(0, css(s.lit, 0.55 * s.litA))
    lg.addColorStop(1, css(s.lit, 0))
    c.fillStyle = lg
    c.fillRect(-s.w, cy - h, 2 * s.w, 2 * h)
  }
  // The seams where the rolls meet: a few short dark lobed lines across the pad, only on Sc broad enough to show them.
  if (!stratus && s.w > 24) {
    const rolls = 1 + Math.floor(r() * 2.5)
    c.lineCap = 'round'
    for (let i = 0; i < rolls; i++) {
      const x = (r() - 0.5) * s.w * 0.6
      const seam = lobed([[x, cy - h * 0.45], [x + (r() - 0.5) * s.w * 0.15, cy + h * 0.45]], r, [h * 0.3, h * 0.6], 0.25, 1, 0)
      trace(c, seam, false)
      c.strokeStyle = css(s.shade, 0.25)
      c.lineWidth = Math.max(0.8, s.w * 0.025)
      c.stroke()
    }
  }
  c.restore()
}

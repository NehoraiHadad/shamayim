import { css, mix, type Ctx2D } from '../hand'
import { lobed, trace, type Pt, type Rand } from './contour'
import type { CloudSprite } from './sprite'

/*
 * The cumulonimbus anvil (incus; WMO Cb capillatus incus plate): where the updraught meets the tropopause its top
 * spreads flat into an ice shelf, sheared downwind far past the tower. Its top is near flat, its underside sags in soft
 * lobes, and its downwind end thins to fibres. Being ice, it is the brightest, most diffuse part of the cloud.
 */
export function paintAnvil(c: Ctx2D, s: CloudSprite, r: Rand, axis: number): void {
  const side = s.lean >= 0 ? 1 : -1
  const top = -s.tall
  const thick = s.tall * (0.1 + 0.05 * r())
  const back = axis - side * s.w * (0.2 + 0.1 * r())
  const front = axis + side * s.w * (0.65 + 0.25 * r())
  const upper: Pt[] = [[back, top + thick * 0.6], [back + (front - back) * 0.3, top], [front, top + thick * 0.15]]
  // The underside sags into the tower's neck: the shelf grows out of the column, it does not float on it.
  const neck = s.tall * 0.32
  const under = lobed([[front, top + thick * 0.35], [axis + side * s.w * 0.15, top + thick * 1.1], [axis + side * s.w * 0.04, top + neck],
    [axis - side * s.w * 0.12, top + neck], [back, top + thick * 0.9]], r,
    [thick * 0.6, thick * 1.4], 0.25, side === 1 ? -1 : 1, 1)
  trace(c, [...upper, ...under])
  const g = c.createLinearGradient(0, top, 0, top + thick * 1.2)
  g.addColorStop(0, css(mix(s.body, s.lit, 0.6 * s.litA)))
  g.addColorStop(1, css(mix(s.body, s.shade, 0.35)))
  c.fillStyle = g
  c.fill()
  // The downwind end frays into fibres.
  c.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    const y = top + thick * (0.1 + 0.5 * r())
    const len = s.w * (0.1 + 0.15 * r())
    c.strokeStyle = css(s.body, 0.25 + 0.2 * r())
    c.lineWidth = Math.max(0.5, thick * 0.15)
    c.beginPath()
    c.moveTo(front - side * len * 0.3, y)
    c.lineTo(front + side * len, y + thick * 0.2 * (r() - 0.3))
    c.stroke()
  }
}

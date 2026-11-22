import { css, mix, type Ctx2D } from '../hand'
import { lobed, padFrame, trace, type Rand } from './contour'
import type { CloudSprite } from './sprite'

/*
 * Altostratus and nimbostratus (track D, SPEC §6), after Constable's rain-cloud sketches (1822) and the WMO As
 * translucidus / Ns plates. A deck is not a wash: it is a sheet with structure.
 * - Its underside undulates in long, low waves (undulatus), the bands crowding together toward the far edge (the top of
 *   the sprite) as perspective foreshortens them.
 * - Thin As lets the sun show as through ground glass (the sprite's τ keeps it translucent); Ns is thick, its base dark
 *   and ragged, with pannus (low dark scud) hanging under it where it rains.
 * Order: the sheet's body, the bands from far to near, the light toward the source, then the pannus.
 */
export function paintDeck(c: Ctx2D, s: CloudSprite, r: Rand): void {
  const h = Math.max(2, s.under + s.tall)
  const top = s.under - h
  const thick = 1 - Math.exp(-s.tau / 20)
  // A sheet whose ends taper and fray: a squared frame, lobed shallowly (a deck's edge is soft, not heaped).
  const sheet = lobed(padFrame(0, top + h / 2, s.w, h, r, 18), r, [s.w * 0.04, s.w * 0.1], 0.1 + 0.08 * thick, -1, 1)
  trace(c, sheet)
  const body = c.createLinearGradient(0, top, 0, s.under)
  body.addColorStop(0, css(mix(s.body, s.lit, 0.25 * s.litA)))
  body.addColorStop(1, css(mix(s.body, s.shade, 0.3 + 0.5 * thick)))
  c.fillStyle = body
  c.fill()
  c.save()
  c.globalCompositeOperation = 'source-atop'
  bands(c, s, r, top, h, thick)
  if (s.toward && s.litA > 0.02) {
    const [tx] = s.toward
    const lg = c.createLinearGradient(tx * s.w * 0.5, 0, -tx * s.w * 0.5, 0)
    lg.addColorStop(0, css(s.lit, 0.35 * s.litA * (1 - 0.6 * thick)))
    lg.addColorStop(1, css(s.lit, 0))
    c.fillStyle = lg
    c.fillRect(-s.w, top - 2, 2 * s.w, h + 4)
  }
  c.restore()
  if (s.rains) pannus(c, s, r)
}

/** The undulations: darker troughs across the sheet, their spacing shrinking toward the far edge (∝ distance²). */
function bands(c: Ctx2D, s: CloudSprite, r: Rand, top: number, h: number, thick: number) {
  const n = 5 + Math.floor(r() * 4)
  c.lineCap = 'round'
  for (let i = 1; i <= n; i++) {
    const u = (i / (n + 1)) ** 1.8
    const y = top + h * u
    const wave = lobed([[-s.w * 0.55, y], [s.w * 0.55, y + (r() - 0.5) * h * 0.04]], r, [s.w * 0.1, s.w * 0.25], 0.05, 1, 0)
    trace(c, wave, false)
    c.strokeStyle = css(s.shade, (0.08 + 0.18 * thick) * (0.4 + 0.6 * u))
    c.lineWidth = Math.max(0.6, h * 0.05 * (0.3 + u))
    c.stroke()
  }
}

/** Pannus: torn dark scud hanging under a raining base, its lower edge ragged. */
function pannus(c: Ctx2D, s: CloudSprite, r: Rand) {
  const tone = mix(s.shade, [0.1, 0.12, 0.15], 0.35)
  const n = 2 + Math.floor(r() * 3)
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * s.w * 0.8, w = s.w * (0.1 + 0.12 * r()), d = Math.max(1.5, s.under * (0.3 + 0.4 * r()))
    const edge = lobed([[x + w / 2, s.under], [x - w / 2, s.under + d * 0.2]], r, [w * 0.1, w * 0.25], 0.5, -1, 1)
    trace(c, [[x - w / 2, s.under - d * 0.3], [x + w / 2, s.under - d * 0.3], ...edge])
    c.fillStyle = css(tone, 0.55 + 0.25 * r())
    c.fill()
  }
}

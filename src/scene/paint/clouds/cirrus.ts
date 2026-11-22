import { css, mix, type Ctx2D } from '../hand'
import type { Rand } from './contour'
import type { CloudSprite } from './sprite'

/*
 * Cirrus and cirrostratus (track D, SPEC §6), after Luke Howard's cloud sketches (1803) and the WMO Ci uncinus and
 * fibratus plates.
 * - Ci: fibres, not bodies. A denser head (the uncinus hook, where the ice is made) and a trail falling behind and below
 *   it along the wind's axis, tapering to nothing. 6–14 strands, slightly divergent, silky, with no shade side.
 * - Cs: a milky veil, fibrous only faintly.
 * Each strand is a stroke drawn as a hand draws it: heavy at the head, fast and thin to the tail.
 */
export function paintCirrus(c: Ctx2D, s: CloudSprite, r: Rand): void {
  const h = Math.max(2, s.under + s.tall)
  const cy = s.under - h / 2
  const tone = s.litA > 0.05 ? mix(s.body, s.lit, Math.min(0.85, s.litA)) : s.body
  const axis = s.axis ?? 0
  const ax = Math.cos(axis), ay = Math.sin(axis)
  c.lineCap = 'round'
  if (s.genus === 'cs') {
    veil(c, s, tone, cy, h, r)
    return
  }
  const strands = 6 + Math.floor(r() * 9)
  // Heads scattered along the upwind end; each trail falls back and down from its head (the fall streak shears behind),
  // nearly parallel to its neighbours. The hook is a small comma curling up at the head, not a stem.
  const side = s.lean >= 0 ? -1 : 1
  for (let i = 0; i < strands; i++) {
    const hx = side * s.w * (0.1 + 0.35 * r())
    const hy = cy - h * 0.35 + h * 0.7 * r()
    const len = s.w * (0.4 + 0.45 * r())
    const ex = hx - side * len * ax, ey = hy + len * ay * 0.3 + h * (0.15 + 0.35 * r())
    const curl = Math.min(h * 0.35, len * 0.08) * (0.6 + 0.6 * r())
    const a = s.share * (0.3 + 0.4 * r())
    const g = c.createLinearGradient(hx, hy, ex, ey)
    g.addColorStop(0, css(tone, a))
    g.addColorStop(0.3, css(tone, a * 0.6))
    g.addColorStop(1, css(tone, 0))
    c.strokeStyle = g
    c.lineWidth = Math.max(0.5, h * (0.05 + 0.1 * r()))
    c.beginPath()
    c.moveTo(hx + side * curl * 0.6, hy - curl)
    c.quadraticCurveTo(hx + side * curl, hy, hx, hy)
    c.quadraticCurveTo((hx + ex) / 2, (hy + ey) / 2 - h * 0.1 * r(), ex, ey)
    c.stroke()
  }
}

/** Cirrostratus: a veil, densest in its middle, with faint fibres combed along the wind. */
function veil(c: Ctx2D, s: CloudSprite, tone: readonly [number, number, number], cy: number, h: number, r: Rand) {
  const t = tone as [number, number, number]
  const g = c.createLinearGradient(0, cy - h / 2, 0, cy + h / 2)
  g.addColorStop(0, css(t, 0))
  g.addColorStop(0.5, css(t, 0.4 * s.share))
  g.addColorStop(1, css(t, 0))
  c.fillStyle = g
  c.fillRect(-s.w / 2, cy - h / 2, s.w, h)
  for (let i = 0; i < 10; i++) {
    const y = cy + (r() - 0.5) * h * 0.8
    const x0 = -s.w / 2 + r() * s.w * 0.4, x1 = x0 + s.w * (0.3 + 0.4 * r())
    const lg = c.createLinearGradient(x0, 0, x1, 0)
    lg.addColorStop(0, css(t, 0))
    lg.addColorStop(0.5, css(t, 0.2 * s.share))
    lg.addColorStop(1, css(t, 0))
    c.strokeStyle = lg
    c.lineWidth = Math.max(0.5, h * 0.06)
    c.beginPath()
    c.moveTo(x0, y)
    c.lineTo(x1, y + (r() - 0.5) * h * 0.1)
    c.stroke()
  }
}

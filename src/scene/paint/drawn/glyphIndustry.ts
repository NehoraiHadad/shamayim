import { poly, rect, type Tracer } from '../glyphs/kit'
import { css, mix } from '../hand'
import type { DrawnGlyphKit } from './glyphKit'

export function highrise(k: DrawnGlyphKit, h: number) {
  const { t, c } = k
  k.box(-5, -2.6, 10, 2.6, 1.2, { shadeW: 0.6 })
  k.rim(-5, -2.6, 10, 0.7)
  k.fill(rect(-3.8, -1.6, 7.4, 1), t.deep, 0.5)
  const x0 = -3.4, x1 = 3.4, crown = -h + 2.6, side = 1.8
  const day = 1 - k.night
  const glassSide = k.face(t.glass, t.glassLit, 1, t.shade)
  const g = c.createLinearGradient(0, crown, 0, -2.6)
  g.addColorStop(0, css(mix(t.wall, mix(t.rim, glassSide, 0.85), day)))
  g.addColorStop(1, css(mix(t.wall, mix(t.wall, glassSide, 0.75), day)))
  rect(x0, crown, side, -2.6 - crown)(c)
  c.fillStyle = g
  c.fill()
  const gf = c.createLinearGradient(0, crown, 0, -2.6)
  gf.addColorStop(0, css(mix(t.wall, t.glass, day)))
  gf.addColorStop(1, css(mix(mix(t.wall, t.shade, 0.3), t.glass, day)))
  rect(x0 + side, crown, x1 - x0 - side, -2.6 - crown)(c)
  c.fillStyle = gf
  c.fill()
  k.fill(rect(x1 - 0.8, crown, 0.8, -2.6 - crown), k.face(t.shade, t.glassLit, -1, t.deep), 0.5 - 0.25 * k.night)
  for (let y = -4; y > crown + 0.6; y -= 1.5) {
    k.fill(rect(x0, y, side, 0.5), t.rim, 0.35 - 0.2 * k.night)
    k.fill(rect(x0 + side, y, x1 - x0 - side, 0.5), t.wall, 0.42 - 0.17 * k.night)
  }
  k.box(-2.6, -h + 1.2, 5.2, 1.4, 1.1, { shadeW: 0.5 })
  k.rim(-2.6, -h + 1.2, 5.2)
  k.fill(rect(x0, crown, x1 - x0, 0.5), t.rim, 0.6)
  k.fill(rect(0.9, -h - 1.6, 0.4, 2.8), t.wall)
  k.fill(rect(0.9, -h - 1.6, 0.2, 2.8), k.litL)
  for (let y = -4.5; y > crown + 0.8; y -= 1.5) {
    for (let x = x0 + 0.4; x < x1 - 0.6; x += 1.2) k.fill(rect(x, y, 0.8, 0.8), mix(t.wall, t.win, 0.8), Number(k.r() < k.s.windows * 0.7))
  }
  k.aviation(1.1, -h - 1.8)
}

export function cooling(k: DrawnGlyphKit, h: number) {
  const { t, c } = k
  const s = h / 14, base = 6 * s, waist = 4 * s, rim = 4.6 * s, wy = -0.65 * h
  const shell: Tracer = (cx) => {
    cx.beginPath(); cx.moveTo(-base, -1.2); cx.quadraticCurveTo(-waist, -0.42 * h, -waist, wy); cx.quadraticCurveTo(-waist, -0.86 * h, -rim, -h)
    cx.lineTo(rim, -h); cx.quadraticCurveTo(waist, -0.86 * h, waist, wy); cx.quadraticCurveTo(waist, -0.42 * h, base, -1.2); cx.closePath()
  }
  k.round(shell, -base, base, 0.6)
  c.save()
  shell(c)
  c.clip()
  for (let i = 1; i < 6; i++) k.fill(rect(-base, -1.2 - i * (h - 1.2) / 6, 2 * base, 0.4), t.shade, 0.14 - 0.08 * k.night)
  c.restore()
  k.fill(rect(-rim, -h, 2 * rim, 0.5), t.rim, 0.7)
  k.fill(rect(-rim + 0.2, -h + 0.5, 2 * rim - 0.4, 0.6), t.shade, 0.7)
  k.fill(rect(-base + 0.3, -1.2, 2 * base - 0.6, 1.2), t.deep, 0.9)
  for (let x = -base + 0.6; x < base - 0.4; x += 1.1) k.fill(poly([x, 0, x + 0.4, 0, x + 0.9, -1.2, x + 0.5, -1.2]), k.face(t.wall, t.lit, Math.max(-1, Math.min(1, -x / base))), 0.85)
}

export function silo(k: DrawnGlyphKit, h: number) {
  const { t } = k
  const bins = h * 0.74
  for (const x of [-6.5, -3.4, -0.3]) k.round(rect(x, -bins, 3.1, bins), x, x + 3.1, 0.66)
  for (const x of [-3.5, -0.4]) k.fill(rect(x, -bins + 0.8, 0.25, bins - 0.8), t.deep, 0.5)
  k.fill(rect(-6.2, -bins - 1.5, 8.6, 1.5), t.wall)
  k.fill(rect(-6.2, -bins - 1.5, 1.2, 1.5), k.litL)
  k.fill(rect(-6.2, -bins - 0.5, 8.6, 0.5), t.shade, 0.5)
  k.rim(-6.2, -bins - 1.5, 8.6)
  k.box(2.8, -h + 1.5, 3.7, h - 1.5, 1, { shadeW: 0.8 })
  k.fill(rect(3.1, -h, 2.6, 1.5), t.wall)
  k.fill(rect(3.1, -h, 0.8, 1.5), k.litL)
  k.rim(3.1, -h, 2.6)
  for (let y = -h + 3.5; y < -2; y += 3) k.open(rect(4.2, y, 0.9, 0.9), y < -h + 4, 0.7)
  k.aviation(4.4, -h - 0.3)
}

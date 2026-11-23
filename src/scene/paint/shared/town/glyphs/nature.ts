import type { GlyphDesc } from '../../../../model/types'
import { css, mix } from '../../base/hand'
import { Kit, poly, rect } from './kit'

/*
 * What grows and what lies in the fields round a village (stage C4), in the scene's hand (kit.ts). References: date
 * palms of the Jordan Valley and Beit She'an groves (a bent trunk, a knob of old frond bases, long arching fronds, none
 * the same length); olive and citrus orchards in rows on the slope; vineyards as rows of vines; solar fields as panel
 * strips with a lit top edge. Fields follow the ground under them (`desc.ground`), row by row down the slope.
 */

/** [side −1 / 1, length, rise of the arch, droop of the tip]; a negative droop is a rising frond. */
type Frond = [number, number, number, number]
const FRONDS: Frond[] = [[-1, 5.6, 1.4, 3.2], [-1, 4.4, 2, 0.2], [-1, 2.8, 2.4, -2.4], [1, 5.2, 1.2, 3.4], [1, 4.4, 1.8, 0.6], [1, 2.6, 2.2, -2.2]]

/** One frond between t0 and t1 along its arched centreline, tapering from 0.7 at the crown to a point. */
function frond([side, length, rise, droop]: Frond, t0: number, t1: number): number[] {
  const cx = side * length * 0.5, cy = -rise, tx = side * length, ty = droop
  const left: number[] = [], right: number[] = []
  for (let i = 0; i <= 5; i++) {
    const t = t0 + (t1 - t0) * i / 5
    const x = 2 * (1 - t) * t * cx + t * t * tx, y = 2 * (1 - t) * t * cy + t * t * ty
    const dx = 2 * (1 - t) * cx + 2 * t * (tx - cx), dy = 2 * (1 - t) * cy + 2 * t * (ty - cy)
    const half = (0.7 * (1 - t) + 0.05) / (Math.hypot(dx, dy) || 1)
    left.push(x - dy * half, y + dx * half)
    right.unshift(x + dy * half, y - dx * half)
  }
  for (let i = 0; i < right.length; i += 2) left.push(right[i], right[i + 1])
  return left
}

/** Three date palms of seeded heights; the crowns lean with the wind (`shine.lean`). */
export function palms(k: Kit, h: number) {
  const { t, c, r } = k
  const lean = k.s.lean
  const trees: [number, number, number][] = [[-4, h - 1 - r(), -0.8], [0, h - 3.5, 0.4], [4, h - 2 + r(), 1]]
  for (const [x, height, bend0] of trees) {
    const bend = bend0 + lean * height * 0.4
    k.fill((cx) => {
      cx.beginPath(); cx.moveTo(x - 0.7, 0); cx.quadraticCurveTo(x + bend * 0.3 - 0.55, -height * 0.5, x + bend - 0.5, -height)
      cx.lineTo(x + bend + 0.5, -height); cx.quadraticCurveTo(x + bend * 0.3 + 0.55, -height * 0.5, x + 0.7, 0); cx.closePath()
    }, mix(t.wall, t.deep, 0.35))
    k.fill(rect(x - 0.7, -height, 0.45, height * 0.9), t.lit, 0.35 * k.kl)
    k.fill(rect(x + 0.25, -height, 0.45, height * 0.9), t.lit, 0.35 * k.kr)
  }
  for (const [x, height, bend0] of trees) {
    const bend = bend0 + lean * height * 0.4
    c.save()
    c.translate(x + bend, -height)
    c.rotate(lean * 0.8)
    const jitter = FRONDS.map(([side, length, rise, droop]): Frond => [side, length + r() * 1.2 - 0.6, rise, droop])
    for (const f of jitter) k.fill(poly(frond(f, 0, 0.62)), t.green)
    for (const f of jitter) k.fill(poly(frond(f, 0.62, 1)), t.green, 0.55)
    for (const f of jitter.filter((f) => f[3] > 2)) k.fill(poly(frond(f, 0, 0.72)), t.shade, 0.8)
    for (const f of jitter.filter((f) => f[3] <= 2)) k.fill(poly(frond(f, 0.15, 0.62)), k.face(t.green, t.greenLit, -f[0]), 0.9)
    k.fill((cx) => { cx.beginPath(); cx.ellipse(0, 0.5, 0.75, 0.9, 0, 0, Math.PI * 2) }, t.shade)
    c.restore()
  }
}

/** The ground under a field at glyph x (relative to its base), from `desc.ground`. */
function groundAt(d: GlyphDesc, x: number) {
  const g = d.ground ?? [0, 0]
  const u = Math.max(0, Math.min(g.length - 1, (x + d.w / 2) / d.w * (g.length - 1)))
  const i = Math.min(g.length - 2, Math.floor(u)), f = u - i
  return g[i] + (g[i + 1] - g[i]) * f
}

/** Orchard: three rows of round trees on the slope, each with its contact shade, a lit side and a shaded side. */
export function orchard(k: Kit, _h: number, d: GlyphDesc) {
  const { t, r } = k
  const half = d.w / 2
  const trees: [number, number, number][] = []
  for (let row = 0; row < 3; row++) {
    for (let x = -half + (row % 2) * 1.75; x <= half; x += 3.5) {
      if (r() < 0.2) continue
      const tx = x + (r() - 0.5) * 1.2
      trees.push([tx, groundAt(d, tx) + row * 2.6 + (r() - 0.5), 1.1 + 0.5 * r()])
    }
  }
  for (const [x, y, rad] of trees) k.fill((c) => { c.beginPath(); c.ellipse(x + 0.6, y + rad * 0.8, rad * 0.9, 0.45, 0, 0, Math.PI * 2) }, t.deep, 0.5)
  for (const [x, y, rad] of trees) {
    k.fill((c) => { c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2) }, t.green)
    k.fill((c) => { c.beginPath(); c.arc(x, y + rad * 0.55, rad * 0.6, 0, Math.PI * 2) }, t.shade, 0.3 * (1 - k.k))
    for (const [dir, weight] of [[-1, k.kl], [1, k.kr]]) {
      k.fill((c) => { c.beginPath(); c.arc(x + dir * rad * 0.3, y - rad * 0.3, rad * 0.6, 0, Math.PI * 2) }, t.greenLit, 0.75 * weight)
      k.fill((c) => { c.beginPath(); c.arc(x - dir * rad * 0.35, y + rad * 0.3, rad * 0.55, 0, Math.PI * 2) }, t.shade, 0.35 * weight)
    }
  }
}

/** Vineyard: four rows of vines along the slope, each a fine dark line with lit leaves on top. */
export function vineyard(k: Kit, _h: number, d: GlyphDesc) {
  const { t, c } = k
  const half = d.w / 2
  for (let row = 0; row < 4; row++) {
    const from = -half + (row % 2) * 2, to = half - ((row + 1) % 3)
    // Each row: its shade on the ground, the vines, the leaves on top catching the light.
    const stroke = (dx: number, dy: number, width: number, colour: string) => {
      c.beginPath()
      for (let x = from; x <= to; x += 1) {
        const y = groundAt(d, x) + row * 2 + dy
        if (x === from) c.moveTo(x + dx, y)
        else c.lineTo(x + dx, y)
      }
      c.lineWidth = width
      c.strokeStyle = colour
      c.stroke()
    }
    stroke(0.4, 0.5, 0.7, css(t.deep, 0.5))
    stroke(0, 0, 0.9, css(t.green))
    stroke(0, -0.25, 0.4, css(mix(t.green, t.rim, 0.2)))
    stroke(-0.25, -0.15, 0.35, css(t.greenLit, k.kl))
    stroke(0.25, -0.15, 0.35, css(t.greenLit, k.kr))
  }
}

/** Solar field: panel strips that follow the slope, tilted to the sky (a lit top edge), dark glass below. */
export function solar(k: Kit, _h: number, d: GlyphDesc) {
  const { t } = k
  const half = d.w / 2
  const band = (from: number, to: number, y: number, thick: number, dx: number): number[] => {
    const top: number[] = [], bottom: number[] = []
    for (let x = from; x < to; x += 1.5) top.push(x, groundAt(d, x) + y)
    top.push(to, groundAt(d, to) + y)
    for (let i = top.length - 2; i >= 0; i -= 2) bottom.push(top[i] + dx, top[i + 1] + thick)
    return [...top, ...bottom]
  }
  for (let row = 0; row < 3; row++) {
    const from = -half + row * 0.8, to = half - (2 - row) * 0.6, y = row * 2.2
    // Panels tilted to the sky mirror it (darker toward their foot), their top edge catching it most.
    k.fill(poly(band(from, to, y, 1.5, -0.9)), mix(t.panel, t.glassLit, 0.35))
    k.fill(poly(band(from, to, y, 0.5, -0.3)), mix(t.panel, t.glassLit, 0.75))
    k.fill(poly(band(from, from + 0.5, y, 1.5, -0.9)), t.glassLit, 0.65 * k.kl)
    k.fill(poly(band(to - 0.5, to, y, 1.5, -0.9)), t.glassLit, 0.65 * k.kr)
    k.fill(poly(band(from, to, y + 1.5, 0.35, -0.9)), t.deep, 0.5)
  }
}

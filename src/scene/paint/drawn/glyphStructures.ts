import { poly, rect } from '../shared/town/glyphs/kit'
import { mix } from '../shared/base/hand'
import type { DrawnGlyphKit } from './glyphKit'

export function lighthouse(k: DrawnGlyphKit, h: number) {
  const { t } = k
  const body = h - 4.5
  k.box(1, -3, 4.5, 3, 0, { shadeW: 0.8, front: t.stone })
  k.fill(poly([0.6, -3, 3.25, -4.5, 5.9, -3]), t.roof)
  k.fill(poly([0.6, -3, 3.25, -4.5, 3.25, -3]), k.roofL, 0.8)
  k.fill(poly([3.25, -4.5, 5.9, -3, 3.25, -3]), k.roofR, 0.8)
  k.open(rect(3.6, -2, 0.8, 0.9), true)
  k.round(poly([-3.5, 0, 0.5, 0, -0.2, -body, -2.8, -body]), -3.5, 0.5)
  for (const y of [-body * 0.33, -body * 0.66]) k.fill(rect(-3.3 + 0.2 * -y / body, y, 3.6, 0.45), t.shade, 0.2)
  k.fill(rect(-3.5, -body - 1, 4, 1), t.wall)
  k.fill(rect(-3.5, -body - 1, 1, 1), k.litL)
  k.rim(-3.5, -body - 1, 4)
  const lit = k.nightFade(0.2, 0.4)
  k.fill(rect(-2.6, -body - 2.8, 2.2, 1.8), mix(t.deep, mix(t.wall, t.win, 0.95), lit), 0.9)
  k.round((c) => { c.beginPath(); c.moveTo(-2.8, -body - 2.8); c.arc(-1.5, -body - 2.8, 1.3, Math.PI, 0); c.closePath() }, -2.8, -0.2, 0.5)
  k.fill(rect(-1.75, -h, 0.5, 1.2), t.wall)
  k.lamp(-1.5, -body - 1.9, 4, t.win, 0.55 * k.night, lit)
}

export function turbine(k: DrawnGlyphKit, h: number) {
  const { t, c } = k
  k.round(poly([-0.8, 0, 0.8, 0, 0.5, -h, -0.5, -h]), -0.8, 0.8)
  const length = 0.42 * h
  c.save()
  c.translate(0, -h)
  for (const angle of [0, 120, 240]) {
    c.save()
    const rotation = angle * Math.PI / 180 + (k.r() - 0.5) * 0.02
    c.rotate(rotation)
    k.fill(poly([-0.6, 0, -0.25, -length, 0.25, -length, 0.6, 0]), t.wall, 0.95)
    k.fill(poly([-0.6, 0, -0.25, -length, -0.05, -length, -0.1, 0]), k.face(t.wall, t.lit, Math.cos(rotation)), 0.75)
    k.fill(poly([0.1, 0, 0.05, -length, 0.25, -length, 0.6, 0]), k.face(t.wall, t.lit, -Math.cos(rotation)), 0.75)
    c.restore()
  }
  k.fill(rect(-1, -0.75, 2.5, 1.5), t.wall)
  k.fill(rect(-1, -0.75, 2.5, 0.5), mix(t.wall, t.rim, 0.3))
  k.fill(rect(-1, 0.25, 2.5, 0.5), t.shade, 0.6)
  c.restore()
  k.aviation(0.6, -h - 0.4)
}

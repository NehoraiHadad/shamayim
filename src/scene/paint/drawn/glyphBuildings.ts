import { arch, disc, MINARET_LAMP, poly, rect } from '../shared/town/glyphs/kit'
import { mix } from '../shared/base/hand'
import type { DrawnGlyphKit } from './glyphKit'

export function minaret(k: DrawnGlyphKit, h: number) {
  const { t } = k
  k.box(-7, -5, 9, 5, 1.5, { shadeW: 1 })
  k.rim(-7, -5, 9)
  k.fill(rect(-7, -5.5, 9, 0.5), t.wall)
  k.fill(rect(-7, -5.5, 1.5, 0.5), k.litL)
  k.rim(-7, -5.5, 9, 0.6)
  k.round(rect(-5, -6.5, 5, 1), -5, 0)
  for (const x of [-4.5, -3, -1.5]) k.fill(rect(x, -6.25, 0.5, 0.5), t.deep, 0.5)
  k.round((c) => {
    c.beginPath(); c.moveTo(-5.2, -6.5); c.bezierCurveTo(-5.2, -8.9, -3.9, -9.6, -2.5, -9.6)
    c.bezierCurveTo(-1.1, -9.6, 0.2, -8.9, 0.2, -6.5); c.closePath()
  }, -5.2, 0.2, 0.55)
  k.fill(rect(-2.75, -10.6, 0.5, 1), t.wall)
  k.fill(rect(-2.9, -11.1, 0.8, 0.5), mix(t.wall, t.rim, 0.6))
  for (const x of [-4.4, -1.6]) k.open(arch(x, -1.2, 1, 2.4), true)
  k.open(arch(-0.2, 0, 1.2, 2.6), true, 0.6)
  // The minaret: square base, shaft, balcony on corbels, upper shaft, pencil cone.
  const bal = -h * 0.68, top = -h + 4.6
  k.box(1.9, -6, 2.6, 6, 0.9, { shadeW: 0.5 })
  k.round(rect(2.2, bal, 2, -6 - bal), 2.2, 4.2)
  k.fill(poly([2.2, bal + 1.2, 4.2, bal + 1.2, 4.9, bal, 1.5, bal]), t.shade)
  k.round(rect(1.4, bal - 0.6, 3.6, 0.6), 1.4, 5)
  k.rim(1.4, bal - 0.6, 3.6, 0.8)
  k.round(rect(2.45, top, 1.5, bal - 0.6 - top), 2.45, 3.95)
  k.round(poly([2.35, top, 4.05, top, 3.2, -h + 0.9]), 2.35, 4.05, 0.5)
  k.fill(rect(3.05, -h, 0.3, 0.9), t.wall)
  k.open(rect(2.95, bal - 3.4, 0.5, 1.2), false)
  k.lamp(3.2, bal - 0.3, 2.2, MINARET_LAMP, 0.75 * k.night, k.nightFade(0.3, 0.5))
}

export function church(k: DrawnGlyphKit, h: number) {
  const { t } = k
  k.fill(poly([-6.5, 0, -6.5, -6, -4.6, -8.4, -2.7, -6, -2.7, 0]), k.stoneL)
  k.fill(rect(-2.7, -6, 5, 6), t.stone)
  k.fill(poly([-4.6, -8.4, 1.8, -8.4, 2.3, -6, -2.7, -6]), t.roof)
  k.fill(poly([-4.6, -8.4, 1.8, -8.4, 1.9, -7.9, -4.2, -7.9]), mix(t.roof, t.rim, 0.24), 0.9)
  k.fill(rect(-2.7, -6, 5, 0.5), t.shade, 0.6)
  k.fill(poly([-6.5, -6, -4.6, -8.4, -4.6, -7.8, -6.1, -5.9]), t.rim, 0.7)
  k.open(disc(-4.6, -5.6, 0.65), true, 0.7)
  k.open(arch(-5.15, 0, 1.1, 2.6), true, 0.55)
  for (const x of [-1.6, 0.5]) k.open(arch(x, -1.6, 0.8, 2.6), true, 0.75)
  const tt = -h + 3.1
  k.box(2, tt, 3.8, -tt, 1.3, { shadeW: 0.7, front: t.stone, sideC: t.stoneLit })
  k.rim(2, tt, 3.8)
  k.fill(rect(2, tt + 3.8, 3.8, 0.5), t.shade, 0.5)
  k.fill(rect(2, tt + 3.3, 3.8, 0.5), t.rim, 0.45)
  k.open(arch(3.45, tt + 3.1, 1.3, 2.4), true, 0.5)
  k.fill(rect(3.5, tt + 2, 1.2, 0.5), mix(t.deep, t.wall, 0.5), 0.8 - 0.5 * k.night)
  k.open(rect(3.85, -5.6, 0.5, 1.4), false)
  k.round(poly([1.8, tt, 6, tt, 3.9, tt - 1.7]), 1.8, 6, 0.48)
  k.fill(rect(3.65, -h - 0.5, 0.5, 2.5), t.wall)
  k.fill(rect(3.2, -h + 0.1, 1.4, 0.5), t.wall)
}

export function synagogue(k: DrawnGlyphKit) {
  const { t } = k
  k.box(3, -8.3, 2.5, 8.3, 0, { shadeW: 0.8 })
  k.rim(3, -8.3, 2.5, 0.6)
  k.box(-5.5, -7, 9, 7, 1.6, { shadeW: 0.6 })
  k.fill(rect(-5.5, -7.6, 9, 0.6), t.wall)
  k.fill(rect(-5.5, -7.6, 1.6, 0.6), k.litL)
  k.rim(-5.5, -7.6, 9)
  k.fill(rect(-5.5, -7, 9, 0.5), t.shade, 0.45)
  k.round(rect(-2.2, -8.5, 2.8, 0.9), -2.2, 0.6)
  k.round((c) => {
    c.beginPath(); c.moveTo(-2.4, -8.5); c.bezierCurveTo(-2.4, -10.2, -1.6, -10.6, -0.8, -10.6)
    c.bezierCurveTo(0, -10.6, 0.8, -10.2, 0.8, -8.5); c.closePath()
  }, -2.4, 0.8, 0.55)
  for (const x of [-3.4, -1.2, 1]) k.open(arch(x, -1.3, 1, 3.8), true, 0.8)
  k.fill(rect(-3.6, -1.3, 5.8, 0.5), t.rim, 0.35)
  k.open(rect(3.9, -1.8, 0.8, 1.8), true, 0.5)
}

export function waterTower(k: DrawnGlyphKit, h: number) {
  const { t } = k
  const s = h - 7.2
  k.round(poly([-1.5, 0, 1.5, 0, 1.15, -s, -1.15, -s]), -1.5, 1.5)
  k.open(rect(-0.45, -1.6, 0.9, 1.6), false)
  k.fill(rect(-1.4, -s * 0.5, 2.8, 0.4), t.shade, 0.3)
  k.fill(poly([-1.15, -s, 1.15, -s, 4.4, -s - 2.2, -4.4, -s - 2.2]), t.shade)
  k.fill(poly([-1.15, -s, -0.6, -s, -3.3, -s - 2.2, -4.4, -s - 2.2]), mix(t.shade, t.lit, 0.35 * k.kl))
  k.fill(poly([0.6, -s, 1.15, -s, 4.4, -s - 2.2, 3.3, -s - 2.2]), mix(t.shade, t.lit, 0.35 * k.kr))
  k.round(rect(-4.5, -s - 5.6, 9, 3.4), -4.5, 4.5)
  k.fill(rect(-4.5, -s - 3.9, 9, 0.5), t.shade, 0.55)
  k.fill(rect(-4.5, -s - 2.7, 9, 0.5), t.shade, 0.5)
  k.round(poly([-4.6, -s - 5.6, 4.6, -s - 5.6, 3.4, -s - 6.4, -3.4, -s - 6.4]), -4.6, 4.6, 0.7)
  k.rim(-3.4, -s - 6.4, 6.8, 0.8)
  k.fill(rect(-0.6, -s - 7.2, 1.4, 0.8), t.wall)
  k.fill(rect(-0.6, -s - 7.2, 0.5, 0.8), k.litL)
  k.aviation(0.1, -s - 7.4)
}

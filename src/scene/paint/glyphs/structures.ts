import { css, mix } from '../hand'
import { Kit, poly, rect } from './kit'

/*
 * Masts, lighthouses, wind turbines and bridges (stage C4), in the scene's hand (kit.ts). References: mast — the
 * lattice transmitter masts of the Galilee and the Carmel (Mount Meron, Har Kna'an); lighthouse — Haifa's Stella Maris and
 * Jaffa's lighthouse (a white tapered tower, gallery, lantern, keeper's house); turbine — the Golan's three-bladed
 * turbines (white tubular tower, nacelle, blades parked one up); bridge — a cable-stayed span on one pylon.
 */

/** Lattice mast: two tapering legs, cross bracing, a spike; open, so the sky shows through and it never reads as a stack. */
export function mast(k: Kit, h: number) {
  const { t } = k
  const top = h - 2
  for (const side of [-1, 1]) {
    k.fill(poly([side * 2.4, 0, side * 1.7, 0, side * 0.15, -top, side * 0.6, -top]), side < 0 ? k.litL : k.litR, 0.9)
  }
  const at = (y: number) => 2.05 - (2.05 - 0.4) * (-y / top)
  for (let i = 1; i < 6; i++) {
    const y = -top * i / 6, half = at(y)
    k.fill(rect(-half, y, 2 * half, 0.45), t.wall, 0.85)
    // A brace across each bay, from one leg's foot to the other's head.
    const y1 = -top * (i - 1) / 6, h1 = at(y1)
    k.fill(poly([-h1, y1, -h1 + 0.35, y1, half, y, half - 0.35, y]), t.wall, 0.55)
  }
  k.fill(rect(-0.3, -h, 0.6, 2.2), t.wall)
  k.fill(rect(-0.3, -h, 0.25, 2.2), k.litL)
  for (const y of [-top * 0.55, -top * 0.8]) k.fill(rect(-0.9, y, 1.8, 0.6), t.shade, 0.8)
  k.aviation(0, -h - 0.3)
}

/** Lighthouse: a white tapered tower, its gallery and lantern (lit by night), a dome cap; the keeper's house beside it. */
export function lighthouse(k: Kit, h: number) {
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

/**
 * Wind turbine: a white tubular tower, the nacelle, three blades parked one up (a still frame: turning waits for the
 * weather's motion, C7). The blades are thin enough that the sky shows round them.
 */
export function turbine(k: Kit, h: number) {
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
    k.fill(poly([-0.6, 0, -0.25, -length, -0.05, -length, -0.1, 0]), k.surfaces?.silver ?? k.face(t.wall, t.lit, Math.cos(rotation)), 0.75)
    k.fill(poly([0.1, 0, 0.05, -length, 0.25, -length, 0.6, 0]), k.surfaces?.silver ?? k.face(t.wall, t.lit, -Math.cos(rotation)), 0.75)
    c.restore()
  }
  k.fill(rect(-1, -0.75, 2.5, 1.5), t.wall)
  k.fill(rect(-1, -0.75, 2.5, 0.5), mix(t.wall, t.rim, 0.3))
  k.fill(rect(-1, 0.25, 2.5, 0.5), t.shade, 0.6)
  c.restore()
  k.aviation(0.6, -h - 0.4)
}

/** Cable-stayed bridge: the deck (its girder edge in shade) on two piers, one pylon, a fan of stays to each side. */
export function bridge(k: Kit, h: number) {
  const { t, c } = k
  const deck = -4
  k.box(-8, deck, 1.5, -deck, 0.5, { shadeW: 0.4 })
  k.box(6.5, deck, 1.5, -deck, 0.5, { shadeW: 0.4 })
  k.fill(rect(-12, deck - 1.5, 24, 1.5), t.wall)
  k.fill(rect(-12, deck - 1.5, 24, 0.5), t.rim, 0.6)
  k.fill(rect(-12, deck - 0.5, 24, 0.5), t.shade)
  k.round(poly([-0.9, deck - 1.5, 0.9, deck - 1.5, 0.6, -h, -0.6, -h]), -0.9, 0.9)
  c.lineWidth = 0.25
  for (const x of [-11, -8, -5, 5, 8, 11]) {
    c.beginPath()
    c.moveTo(Math.sign(x) * 0.4, -h + 1.5 + (11 - Math.abs(x)) * 0.5)
    c.lineTo(x, deck - 1.5)
    c.strokeStyle = css(x < 0 ? k.litL : k.litR, 0.8)
    c.stroke()
  }
}

import type { RGB } from '../../../world/types'
import type { Shine, Tones } from '../../model/types'
import { rng } from '../core'
import { css, mix, type Ctx2D } from '../hand'

/*
 * The glyphs' drawing kit (stage C4), after the prototype's `sceneGlyphs.ts` (docs/design/prototypes/canvas-scene/).
 * MEDIUM: the scene's own hand: flat opaque tone shapes with hard edges, no outline, cut from the ridge colour and lifted
 * toward the sky; round bodies take a falloff (lit → wall → shade → a sliver of reflected sky); edges facing the light
 * take a 0.5 px rim. ORDER: cast shadow → body → lit face → core shadow → openings → rim → grain → lamps.
 * Glyph space: px round the base point, x 0 the centre, y 0 the ground, up negative, THE LIGHT ON THE LEFT (the painter
 * mirrors a glyph when the light is on the right). Pure: randomness only from the glyph's seed.
 */

export type Tracer = (c: Ctx2D) => void
export interface Lamp { x: number; y: number; r: number; c: RGB; a: number }

export const poly = (pts: readonly number[]): Tracer => (c) => {
  c.beginPath()
  c.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1])
  c.closePath()
}
export const rect = (x: number, y: number, w: number, h: number): Tracer => (c) => { c.beginPath(); c.rect(x, y, w, h) }
/** An arched opening: a rectangle with a round head, standing on `y` (its sill). */
export const arch = (x: number, y: number, w: number, h: number): Tracer => (c) => {
  const r = w / 2
  c.beginPath()
  c.moveTo(x, y)
  c.lineTo(x, y - h + r)
  c.arc(x + r, y - h + r, r, Math.PI, 0)
  c.lineTo(x + w, y)
  c.closePath()
}
export const disc = (x: number, y: number, r: number): Tracer => (c) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2) }

/** Red aviation light; a minaret's green balcony lamp. */
export const AVIATION: RGB = [1, 0.35, 0.29]
export const MINARET_LAMP: RGB = [0.49, 0.88, 0.63]

/** The kit handed to each glyph: its tones and the shared light, fills, round-body falloff, boxes, rims, openings, lamps. */
export class Kit {
  readonly lamps: Lamp[] = []
  readonly r: () => number
  readonly c: Ctx2D
  readonly t: Tones
  readonly s: Shine
  /** No side to the light (overcast, night): round bodies even out, lit faces barely lift. */
  readonly flat: boolean
  constructor(c: Ctx2D, t: Tones, s: Shine, seed: number, flat: boolean) {
    this.c = c
    this.t = t
    this.s = s
    this.flat = flat
    this.r = rng(seed * 31 + 7)
  }

  get night() { return this.s.night }

  fill(tr: Tracer, col: RGB, a = 1) {
    if (a <= 0.004) return
    tr(this.c)
    this.c.fillStyle = css(col, a)
    this.c.fill()
  }

  /**
   * A round body (cylinder, cone, dome) between x0 and x1: the light falls off from the lit side, a sliver of reflected
   * sky comes back on the far edge. With no side to the light (overcast, night) it evens out to wall with a faint rim.
   */
  round(tr: Tracer, x0: number, x1: number, term = 0.62) {
    const { t } = this
    const g = this.c.createLinearGradient(x0, 0, x1, 0)
    if (this.flat) {
      g.addColorStop(0, css(mix(t.wall, t.rim, 0.3)))
      g.addColorStop(0.35, css(t.wall))
      g.addColorStop(1, css(mix(t.wall, t.shade, 0.5)))
    } else {
      g.addColorStop(0, css(mix(t.lit, t.rim, 0.4)))
      g.addColorStop(0.18, css(t.lit))
      g.addColorStop(term * 0.7, css(t.wall))
      g.addColorStop(term, css(mix(t.wall, t.shade, 0.7)))
      g.addColorStop(0.9, css(t.shade))
      g.addColorStop(1, css(t.refl))
    }
    tr(this.c)
    this.c.fillStyle = g
    this.c.fill()
  }

  /** A box at three-quarters: a narrow lit side face on the light's side, the front in wall tone, a core shadow strip. */
  box(x: number, y: number, w: number, h: number, side: number, opts: { shadeW?: number; front?: RGB; sideC?: RGB } = {}) {
    this.fill(rect(x, y, w, h), opts.front ?? this.t.wall)
    if (side > 0) this.fill(rect(x, y, side, h), this.flat ? mix(opts.front ?? this.t.wall, this.t.rim, 0.25) : opts.sideC ?? this.t.lit)
    const sw = opts.shadeW ?? 0
    if (sw > 0) this.fill(rect(x + w - sw, y, sw, h), this.t.shade, this.flat ? 0.25 : 0.55)
  }

  /** Rim light on an edge facing the light or the sky (0.5 px). */
  rim(x: number, y: number, w: number, a = 0.9) { this.fill(rect(x, y, w, 0.5), this.t.rim, a * (1 - 0.5 * this.night)) }

  /** A window or opening: a dark recess, or a warm lamp by night when it is one of the lit share. */
  open(tr: Tracer, canLight = false, warm = 0.85) {
    const lit = canLight && this.r() < this.s.windows
    if (lit) this.fill(tr, mix(this.t.wall, this.t.win, warm))
    else this.fill(tr, this.t.deep, 0.85 - 0.25 * this.night)
  }

  lamp(x: number, y: number, r: number, c: RGB, a = 1) { this.lamps.push({ x, y, r, c, a }) }

  /** An aviation light on a tall top, by night and at dusk. */
  aviation(x: number, y: number) { if (this.s.aviation) this.lamp(x, y, 1.3, AVIATION, 0.5 + 0.5 * this.night) }

  /** A shape filled with a vertical gradient between two tones (top → bottom). */
  vgrad(tr: Tracer, y0: number, y1: number, top: RGB, bottom: RGB, a = 1) {
    const g = this.c.createLinearGradient(0, y0, 0, y1)
    g.addColorStop(0, css(top, a))
    g.addColorStop(1, css(bottom, a))
    tr(this.c)
    this.c.fillStyle = g
    this.c.fill()
  }
}

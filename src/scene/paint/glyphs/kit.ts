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
 * mirrors a glyph when the light is on the right; the lit side's strength `k` blends it from even to sided, so the mirror
 * never shows). Pure: randomness only from the glyph's seed.
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
  /** The tones with the lit faces taken by the light's side strength (`k`): at 0 a lit face is the wall's own. */
  readonly t: Tones
  readonly s: Shine
  /**
   * The living light: how strongly the glyph's lit side (always drawn on the left) stands out from its shade side, 0–1
   * (the difference of the two sides' light, `Shine.faces`). At 0 (no direct light, or the light straight ahead or behind)
   * the glyph is even and symmetric, so mirroring it as the light crosses the view never shows.
   */
  readonly k: number
  constructor(c: Ctx2D, t: Tones, s: Shine, seed: number, k: number) {
    this.c = c
    this.k = Math.max(0, Math.min(1, k))
    this.t = { ...t, lit: mix(t.wall, t.lit, this.k), stoneLit: mix(t.stone, t.stoneLit, this.k), roofLit: mix(t.roof, t.roofLit, this.k),
      greenLit: mix(t.green, t.greenLit, this.k) }
    this.s = s
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
    const { t, k } = this
    const g = this.c.createLinearGradient(x0, 0, x1, 0)
    // Even (the sky's light from above: a little light down the middle, both edges turning away) blended into the side
    // light's falloff by `k`: the same stops for both, so the body turns with the light.
    const even: [number, RGB][] = [[0, mix(t.wall, t.shade, 0.35)], [0.5, mix(t.wall, t.rim, 0.15)], [1, mix(t.wall, t.shade, 0.35)]]
    const sided: [number, RGB][] = [[0, mix(t.lit, t.rim, 0.4)], [0.18, t.lit], [term * 0.7, t.wall], [term, mix(t.wall, t.shade, 0.7)],
      [0.9, t.shade], [1, t.refl]]
    const at = (stops: [number, RGB][], p: number): RGB => {
      for (let i = 1; i < stops.length; i++) {
        if (p <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (p - stops[i - 1][0]) / Math.max(1e-6, stops[i][0] - stops[i - 1][0]))
      }
      return stops[stops.length - 1][1]
    }
    for (const p of [...new Set([0, 0.18, 0.35, 0.5, term * 0.7, term, 0.9, 1])].sort((a, b) => a - b)) {
      g.addColorStop(p, css(mix(at(even, p), at(sided, p), k)))
    }
    tr(this.c)
    this.c.fillStyle = g
    this.c.fill()
  }

  /** A box at three-quarters: a narrow lit side face on the light's side, the front in wall tone, a core shadow strip. */
  box(x: number, y: number, w: number, h: number, side: number, opts: { shadeW?: number; front?: RGB; sideC?: RGB } = {}) {
    const front = opts.front ?? this.t.wall
    this.fill(rect(x, y, w, h), front)
    // The side face: turned away from the eye, so a little in shade under an even sky; lit as the light comes to its side.
    if (side > 0) this.fill(rect(x, y, side, h), mix(mix(front, this.t.shade, 0.25), opts.sideC ?? this.t.lit, this.k))
    const sw = opts.shadeW ?? 0
    if (sw > 0) this.fill(rect(x + w - sw, y, sw, h), this.t.shade, 0.25 + 0.3 * this.k)
  }

  /** Rim light on an edge facing the light or the sky (0.5 px). */
  rim(x: number, y: number, w: number, a = 0.9) {
    // A back-lit edge catches more of it (the source low beyond the glyph).
    this.fill(rect(x, y, w, 0.5), this.t.rim, Math.min(1, a * (1 - 0.5 * this.night) * (1 + 0.5 * (this.s.faces?.rim ?? 0))))
  }

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

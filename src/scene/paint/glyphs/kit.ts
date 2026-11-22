import type { RGB } from '../../../world/types'
import { smoothstep } from '../../../domain/smoothstep'
import type { Shine, Tones } from '../../model/types'
import { rng } from '../core'
import { css, mix, type Ctx2D } from '../hand'
import { roundGradient } from './kitLight'

/*
 * The glyphs' drawing kit (stage C4), after the prototype's `sceneGlyphs.ts` (docs/design/prototypes/canvas-scene/).
 * MEDIUM: the scene's own hand: flat opaque tone shapes with hard edges, no outline, cut from the ridge colour and lifted
 * toward the sky; round bodies take a falloff (lit → wall → shade → a sliver of reflected sky); edges facing the light
 * take a 0.5 px rim. ORDER: cast shadow → body → lit face → core shadow → openings → rim → grain → lamps.
 * Glyph space has fixed handedness. Signed lateral light is positive from glyph-left.
 * Randomness comes only from the glyph seed.
 */

export type Tracer = (c: Ctx2D) => void
export interface Lamp { x: number; y: number; r: number; c: RGB; a: number; fade?: number }

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
const AVIATION: RGB = [1, 0.35, 0.29]
export const MINARET_LAMP: RGB = [0.49, 0.88, 0.63]

export function aviationLamp(x: number, y: number, shine: Shine): Lamp {
  return { x, y, r: 1.3, c: AVIATION, a: 0.5 + 0.5 * shine.night,
    fade: shine.aviationStrength }
}

/** The kit handed to each glyph: its tones and the shared light, fills, round-body falloff, boxes, rims, openings, lamps. */
export class Kit {
  readonly lamps: Lamp[] = []
  readonly r: () => number
  readonly c: Ctx2D
  readonly t: Tones
  readonly s: Shine
  readonly l: number
  readonly kl: number
  readonly kr: number
  /** Magnitude of the lateral face difference, from even (0) to fully sided (1). */
  readonly k: number
  constructor(c: Ctx2D, t: Tones, s: Shine, seed: number, l: number) {
    this.c = c
    this.l = Math.max(-1, Math.min(1, l))
    this.kl = Math.max(0, this.l)
    this.kr = Math.max(0, -this.l)
    this.k = Math.abs(this.l)
    this.t = t
    this.s = s
    this.r = rng(seed * 31 + 7)
  }

  get litL() { return this.face(this.t.wall, this.t.lit) }
  get litR() { return this.face(this.t.wall, this.t.lit, -1) }
  get stoneL() { return this.face(this.t.stone, this.t.stoneLit) }
  get roofL() { return this.face(this.t.roof, this.t.roofLit) }
  get roofR() { return this.face(this.t.roof, this.t.roofLit, -1) }

  /** Tone for a fixed face, with a signed horizontal component of its normal. */
  face(even: RGB, lit: RGB, normal = 1, shade = even) {
    const weight = this.l * normal
    return mix(mix(even, lit, Math.max(0, weight)), shade, Math.max(0, -weight))
  }

  get night() { return this.s.night }

  nightFade(from: number, to: number) { return smoothstep(from, to, this.night) }

  fill(tr: Tracer, col: RGB, a = 1) {
    tr(this.c)
    this.c.fillStyle = css(col, a)
    this.c.fill()
  }

  /**
   * A round body (cylinder, cone, dome) between x0 and x1: the light falls off from the lit side, a sliver of reflected
   * sky comes back on the far edge. With no side to the light (overcast, night) it evens out to wall with a faint rim.
   */
  round(tr: Tracer, x0: number, x1: number, term = 0.62, wall = this.t.wall, lit = this.t.lit) {
    const g = roundGradient(this.c, this.t, this.l, x0, x1, term, wall, lit)
    tr(this.c)
    this.c.fillStyle = g
    this.c.fill()
  }

  /** A three-quarter box with a fixed left face and a far edge that can catch light or deepen into shade. */
  box(x: number, y: number, w: number, h: number, side: number, opts: { shadeW?: number; front?: RGB; sideC?: RGB } = {}) {
    const front = opts.front ?? this.t.wall
    this.fill(rect(x, y, w, h), front)
    // The side face: turned away from the eye, so a little in shade under an even sky; lit as the light comes to its side.
    if (side > 0) this.fill(rect(x, y, side, h), this.face(mix(front, this.t.shade, 0.25), opts.sideC ?? this.t.lit, 1, this.t.shade))
    const sw = opts.shadeW ?? 0
    if (sw > 0) this.fill(rect(x + w - sw, y, sw, h), mix(this.t.shade, opts.sideC ?? this.t.lit, this.kr), 0.25 + 0.3 * this.kl)
  }

  /** Rim light on an edge facing the light or the sky (0.5 px). */
  rim(x: number, y: number, w: number, a = 0.9) {
    // A back-lit edge catches more of it (the source low beyond the glyph).
    this.fill(rect(x, y, w, 0.5), this.t.rim, Math.min(1, a * (1 - 0.5 * this.night) * (1 + 0.5 * (this.s.faces.rim))))
  }

  /** A window or opening: a dark recess, or a warm lamp by night when it is one of the lit share. */
  open(tr: Tracer, canLight = false, warm = 0.85) {
    if (canLight && this.r() < this.s.windows) this.fill(tr, mix(this.t.wall, this.t.win, warm))
    else this.fill(tr, this.t.deep, 0.85 - 0.25 * this.night)
  }

  lamp(x: number, y: number, r: number, c: RGB, a = 1, fade?: number) { this.lamps.push({ x, y, r, c, a, fade }) }

  /** An aviation light on a tall top, by night and at dusk. */
  aviation(x: number, y: number) { this.lamps.push(aviationLamp(x, y, this.s)) }

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

import type { RGB } from '../../../../../world/types'
import { smoothstep } from '../../../../../domain/smoothstep'
import type { GlyphSurfaces } from '../../../../model/glyphSurfaces'
import type { Shine, Tones } from '../../../../model/types'
import { rng } from '../../base/core'
import { css, mix, type Ctx2D } from '../../base/hand'
import { paintPass } from '../../base/paintPass'
import { sectorGradient } from './kitLight'

/*
 * The glyphs' drawing kit (stage C4), after the prototype's `sceneGlyphs.ts` (docs/design/prototypes/canvas-scene/).
 * MEDIUM: the scene's own hand: flat opaque tone shapes with hard edges, no outline, cut from the ridge colour and lifted
 * toward the sky; round bodies take a falloff (lit → wall → shade → a sliver of reflected sky); edges facing the light
 * take a 0.5 px rim. ORDER: cast shadow → body → lit face → core shadow → openings → rim → grain → lamps.
 * Glyph space has fixed handedness. Architectural palettes carry the angle of each surface in that space.
 * Randomness comes only from the glyph seed.
 */

import { rect, type Tracer } from './kitGeometry'
export { arch, disc, poly, rect, type Tracer } from './kitGeometry'

export interface Lamp { x: number; y: number; r: number; c: RGB; a: number; fade?: number }

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
  readonly surfaces?: GlyphSurfaces
  readonly windowWall: RGB
  readonly windowRecess: RGB
  constructor(c: Ctx2D, t: Tones, s: Shine, seed: number, l: number, surfaces?: GlyphSurfaces, windowWall = t.wall, windowRecess = t.deep) {
    this.c = c
    this.l = Math.max(-1, Math.min(1, l))
    this.kl = Math.max(0, this.l)
    this.kr = Math.max(0, -this.l)
    this.k = Math.abs(this.l)
    this.t = t
    this.s = s
    this.surfaces = surfaces
    this.windowWall = windowWall
    this.windowRecess = windowRecess
    this.r = rng(seed * 31 + 7)
  }

  get litL() { return this.surfaces!.wall[0] }
  get litR() { return this.surfaces!.wall[1] }
  get stoneL() { return this.surfaces!.stone[0] }
  get roofL() { return this.surfaces!.tile[0] }
  get roofR() { return this.surfaces!.tile[1] }

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

  /** Interpolate the receiver samples across the projected curved wall. */
  round(tr: Tracer, x0: number, x1: number, glass = false) {
    const surfaces = this.surfaces!
    const sectors = glass ? surfaces.roundGlass! : surfaces.round
    tr(this.c)
    this.c.fillStyle = sectorGradient(this.c, x0, x1, sectors)
    this.c.fill()
  }

  /** A three-quarter box with a fixed left face and a far edge that can catch light or deepen into shade. */
  box(x: number, y: number, w: number, h: number, side: number, opts: { shadeW?: number; front?: RGB; sideC?: RGB } = {}) {
    const front = opts.front ?? this.t.wall
    this.fill(rect(x, y, w, h), front)
    const surfaces = this.surfaces!
    const faces = opts.sideC === this.t.stoneLit || opts.front === this.t.stone ? surfaces.stone : surfaces.wall
    if (side > 0) this.fill(rect(x, y, side, h), faces[0])
    if (opts.shadeW) this.fill(rect(x + w - opts.shadeW, y, opts.shadeW, h), faces[1])
  }

  /** Projected top of a ledge or parapet. */
  rim(x: number, y: number, w: number, opacity = 1) {
    this.fill(rect(x, y, w, Math.min(.48, w * .15)), this.t.rim, opacity)
  }

  eave(x: number, y: number, w: number, h: number) {
    this.vgrad(rect(x, y, w, h), y, y + h, this.surfaces!.eave, this.t.wall)
  }

  /** A window or opening: a dark recess, or a warm lamp by night when it is one of the lit share. */
  open(tr: Tracer, canLight = false, warm = 0.85) {
    if (canLight && this.r() < this.s.windows) this.pane(tr, warm, true)
    else this.fill(tr, this.t.deep, 0.85 - 0.25 * this.night)
  }

  pane(tr: Tracer, warm: number, on: boolean) {
    if (on) paintPass(this.c, 'emission', () => this.fill(tr, mix(this.windowWall, this.t.win, warm)))
    else this.fill(tr, this.t.win, 0)
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

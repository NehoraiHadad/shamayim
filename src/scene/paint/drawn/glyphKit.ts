import type { RGB } from '../../../world/types'
import type { DrawnTones } from '../../model/drawnTones'
import { Kit, rect, type Tracer } from '../glyphs/kit'
import { mix } from '../hand'
import { roundGradient } from './glyphLight'

/** The drawn town keeps the illustrated falloff, ledges and windows of its original glyphs. */
export class DrawnGlyphKit extends Kit {
  declare readonly t: DrawnTones

  get litL() { return this.face(this.t.wall, this.t.lit) }
  get litR() { return this.face(this.t.wall, this.t.lit, -1) }
  get stoneL() { return this.face(this.t.stone, this.t.stoneLit) }
  get roofL() { return this.face(this.t.roof, this.t.roofLit) }
  get roofR() { return this.face(this.t.roof, this.t.roofLit, -1) }

  /**
   * A round body (cylinder, cone, dome) between x0 and x1: the light falls off from the lit side, a sliver of reflected
   * sky comes back on the far edge. With no side to the light (overcast, night) it evens out to wall with a faint rim.
   */
  round(tr: Tracer, x0: number, x1: number, term: number | boolean = 0.62, wall = this.t.wall, lit = this.t.lit) {
    const g = roundGradient(this.c, this.t, this.l, x0, x1, typeof term === 'number' ? term : 0.62, wall, lit)
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
}

import type { RGB, Shine, Tones } from '../../model/types'
import { mix } from '../shared/base/hand'
import type { SkyForm } from './outsideOwn'
import { facesOf } from './outsideLight'

/*
 * The drawn town's light: two clear faces for every body, its front and the one side it shows, and its roof, each
 * one flat value from the model's own shares (the print's colour blocks; no value runs across a face, so no body turns
 * into a drum). An illustration never lets its two sides come out alike: where the direct light gives them little
 * difference (a high, hidden or facing sun), the brighter sky's side does, continuously, so the lit side turns with the
 * light and never jumps. Pure.
 */

/** How fast the side saturates with the light's lean; its least share with the sun out and under an even sky. */
const TURN = 2.6, LEAST = 0.55, LEAST_EVEN = 0.4
/** How far a side from the light goes to the shade, and to the deep; what the direct light adds. */
const SHADED = 0.55, SHADED_SUN = 0.3, DEEP = 0.35
/** The lit face's turn from its plaster to the light. */
const FRONT = 0.9
/** The key's ink: how far it goes from the body's own shade face to the deep. */
const INK = 0.25
/** A roof's light with the sky alone, and with the light from above. */
const ROOF_SKY = 0.4, ROOF_SUN = 0.6

export interface TownLight {
  left: number; right: number; front: number; top: number; rim: number; on: number; glint: number; night: number
}

export function townLight(s: Shine, form: SkyForm): TownLight {
  const f = facesOf(s), day = 1 - s.night
  const lean = Math.tanh(TURN * (s.faces.across * f.on + (f.right - f.left) - form.side * form.strength * (1 - f.on)))
  const least = (LEAST_EVEN + (LEAST - LEAST_EVEN) * f.on) * (0.35 + 0.65 * day)
  return { left: Math.max(f.left, least * Math.max(0, -lean)), right: Math.max(f.right, least * Math.max(0, lean)),
    front: f.front, top: Math.min(1, ROOF_SKY + ROOF_SUN * f.top), rim: f.rim, on: f.on, glint: f.glint * day, night: s.night }
}

/** A body's plaster: its own stone (0…1). */
export const plasterOf = (t: Tones, stone: number): RGB => mix(mix(t.wall, t.shade, 0.35 * (1 - stone)), t.stone, 1.1 * stone)

/** The side a body shows against its width, at least and as it turns to the light (px at most); a lit side shown
 *  against the light, against the width and at most (px): the stone in the sun is then the body's larger face. */
const SIDE = 0.24, SIDE_LIT = 0.12, SIDE_MAX = 3.2, SHOWN_LIT = 0.45, SHOWN_LIT_MAX = 6
/** The least step of value between a body's two faces under the sun: the print never lets them come out alike. */
const GAP = 0.4
/** How much of its sunlit step a body keeps under an even sky (overcast, rain, dusk): its faces close toward the plaster. */
const EVEN = 0.4
/** The lit face's least value under the sun, and how fast it takes the light: a lit wall reads as paper, never grey. */
const LIT_LEAST = 0.72, LIT_TURN = 1.6
/** The shade face's value under no light, and how far its own light lifts it. */
const SHADE_LEAST = 0.52, SHADE_TURN = 0.35
/** The plaster's place on the faces' scale with no direct light (dusk, an even sky): a dull wall is the plaster gone a
 *  share of the way to its own shade, as the model's wall under a dull sky returns about what the ground does. */
const DULL_FACE = 0.35

/** Against the light: the front's light under this, and a side's this much over it. */
const AGAINST = 0.1, OVER = 0.35

/**
 * The one side a body shows, beside its front. The front is the lit face and the side away from the light shows in
 * shade, as an illustrator sets a street up; only against the light (the front dark, a side well lit) does the lit side
 * show, the front then its shade. The whole town shows the same
 * side, as the light is one.
 */
export function sideOf(l: TownLight): { right: boolean; k: number; lit: boolean } {
  const bright = l.left > l.right ? 'left' : 'right', dim = bright === 'left' ? 'right' : 'left'
  const lit = l.front < AGAINST && l[bright] > l.front + OVER
  const show = lit ? bright : dim
  return { right: show === 'right', k: l[show], lit }
}

/** The width (px) of the side a body `w` wide shows. */
export const sideWidth = (l: TownLight, w: number) => {
  const { k, lit } = sideOf(l)
  return lit ? Math.min(SHOWN_LIT_MAX, w * SHOWN_LIT) : Math.min(SIDE_MAX, w * (SIDE + SIDE_LIT * k))
}

/** A body's colour blocks: front, its one side, the roof seen from the front and its hip, and the key's ink. */
export interface Planes { front: RGB; side: RGB; right: boolean; roof: RGB; ink: RGB; joint: RGB }

/** The blocks of a body of this plaster and stone: one value each, the lit one its stone in the light, the other its shade. */
export function planesOf(t: Tones, l: TownLight, plaster: RGB, stone: number): Planes {
  const lit = mix(t.lit, t.stoneLit, 0.35 + 0.5 * stone)
  const dark = mix(mix(plaster, t.shade, SHADED + SHADED_SUN * l.on), t.deep, DEEP)
  const { right, k, lit: sideLit } = sideOf(l)
  const hi = Math.max(l.left, l.right, l.front), lo = Math.min(k, l.front)
  // The faces' values: 0 the shade's dark, 0.5 the plaster, 1 the light. Only the direct light lifts a face over its
  // plaster; with none (dusk, an even sky) the lit face sinks below it and the shade face further, a step apart.
  const sun = EVEN + (1 - EVEN) * l.on, gap = GAP * sun, direct = l.on * (1 - l.night)
  const mid = 0.5 - DULL_FACE * (1 - direct)
  const up = mid + (LIT_LEAST - 0.5 + (1 - LIT_LEAST) * Math.min(1, LIT_TURN * hi)) * direct
  const down = Math.max(0, Math.min(up - gap, (SHADE_LEAST * (0.8 + 0.2 * l.on) + SHADE_TURN * lo) * (mid * 2)))
  const front = sideLit ? down : up, side = sideLit ? up : down
  const face = (v: number) => v >= 0.5 ? mix(plaster, lit, (v - 0.5) * 2 * FRONT) : mix(dark, plaster, v * 2)
  const shade = face(down)
  return { front: face(front), side: face(side), right,
    roof: mix(mix(plaster, t.rim, 0.5), mix(lit, t.rim, 0.25), l.top),
    ink: mix(shade, t.deep, INK), joint: mix(shade, t.deep, INK * 0.4) }
}

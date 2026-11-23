import type { RGB, Shine, Tones } from '../../model/types'
import { mix } from '../hand'
import type { SkyForm } from './light/skyForm'
import { facesOf } from './outsideLight'

/*
 * The drawn town's light: three clear planes for every body, front, left and right, and its roof, each from the model's
 * own shares. An illustration never lets its two sides come out alike: where the direct light gives them little
 * difference (a high, hidden or facing sun), the brighter sky's side does, continuously, so the lit side turns with the
 * light and never jumps. Pure.
 */

/** How fast the side saturates with the light's lean; its least share with the sun out and under an even sky. */
const TURN = 2.6, LEAST = 0.55, LEAST_EVEN = 0.4
/** How far a side from the light goes to the shade, and to the deep; what the direct light adds. */
const SHADED = 0.55, SHADED_SUN = 0.3, DEEP = 0.35
/** The front's own turn to the light, over its plaster. */
const FRONT = 0.75
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

/** A side plane's width against the body's, in the shade and in the light, at most (px). */
const SIDE = 0.2, SIDE_LIT = 0.26, SIDE_MAX = 3.4

/** The widths (px) of a body's side planes: the lit one is the wider. */
export const sidesOf = (l: TownLight, w: number) => [l.left, l.right].map((k) => Math.min(SIDE_MAX, w * (SIDE + SIDE_LIT * Math.min(1, 1.6 * k)))) as [number, number]

export interface Planes { front: RGB; left: RGB; right: RGB; roof: RGB }

/** The planes of a body of this plaster and stone: the lit ones its stone in the light, the others its own shade. */
export function planesOf(t: Tones, l: TownLight, plaster: RGB, stone: number): Planes {
  const lit = mix(t.lit, t.stoneLit, 0.35 + 0.5 * stone)
  const dark = mix(mix(plaster, t.shade, SHADED + SHADED_SUN * l.on), t.deep, DEEP)
  const side = (k: number) => mix(mix(plaster, dark, Math.max(0, 1 - 2 * k)), lit, Math.min(1, 1.5 * k))
  return { front: mix(plaster, lit, FRONT * l.front), left: side(l.left), right: side(l.right),
    roof: mix(mix(plaster, t.rim, 0.5), mix(lit, t.rim, 0.25), l.top) }
}

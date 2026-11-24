import { smoothstep } from '../../../../domain/smoothstep'
import type { LayerOf, RGB } from '../../../model/types'
import { mix } from '../../shared/base/hand'
import { toneOf } from '../../shared/cloud/deck'

/*
 * A point of cloud's colour, one hand for sheets and towers: its place between the model's lit and shade colours by the
 * light that reaches it (the sun's, the sky's), its base and its heads, and over the lit one on a crown. The model's lit,
 * body and shade make the range; the light says where on it a point stands, and a little past its ends.
 */

/** How far the model's tone places a point between lit and shade (the rest is the cloud's own light). */
const MODEL_SHARE = 0.34
/** How strongly a head's side toward the light and its far side part, and what of it is left deep in the mass's shade. */
const RELIEF = 0.72, IN_SHADE = 0.45
/** How far over the model's lit colour the brightest crowns stand, as light (the model's lit is a mass's mean). */
const CROWN = 0.24
/** How much brighter yet the heads that face the light stand out of a mass already lit, against its crowns. */
const CROWN_TO = 1.6
/** How far under the model's shade the deepest shade stands (its red the most: a shade is lit by the sky), from which place. */
const UNDER = 0.26, UNDER_FROM = 0.5
/** How far a hole's far wall stands toward the lit colour, and its near edge's underside toward the shade. */
const WALL = 0.45, EDGE = 0.2
/** How far a low sun's light goes through a cloud, and how much warmer than its body its lit colour then is. */
const LOW = 0.42, WARM = [0.08, 0.3] as const
/** How bright a body and a shade are at most against the lit colour, with a light of its own, and how far they are held to it (a low sun's lit colour is deep,
 *  the sky's on the body pale: unchecked, the shade side would be the bright one). */
const BODY_UP_TO = 1, SHADE_UP_TO = 0.9, HELD = 0.43
const FAR_CROWNS = 0.45
/** Steps of the model's ramp from lit to shade, and the place past its end a shade may stand at; how near its ends a place bends. */
const RAMP = 255, FULL = 1.1, TOE = 0.24

export interface CloudPoint {
  /** The model's tone, the light that reaches the point and its own shade (`CloudLight`). */
  tone: number; light: number; shade: number
  /** How far a head faces away from the light, and how thick the cloud is. */
  relief: number; thick: number
  /** What distance leaves of the contrast. */
  near: number
  /** How far it is a hole's far wall, and the straight edge of an underside (0–1). */
  wall: number; flat: number
}

export const cloudPoint = (): CloudPoint =>
  ({ tone: 0, light: 1, shade: 0, relief: 0, thick: 0, near: 1, wall: 0, flat: 0 })

const lightness = (c: RGB) => 0.21 * c[0] + 0.72 * c[1] + 0.07 * c[2]
/** A colour no brighter than `most`, by `part`. */
const upTo = (c: RGB, most: number, part: number): RGB => {
  const k = 1 - part * (1 - Math.min(1, most / Math.max(1e-6, lightness(c))))
  return [c[0] * k, c[1] * k, c[2] * k]
}
/** A place on the ramp with no hard end: past `TOE` from either end it only nears it, so the palest and the deepest parts of
 *  a mass keep their form. `own`: how far the place is its own light's. */
const within = (t: number, own: number) => {
  const toe = TOE * own, low = t < toe ? (toe * toe) / (2 * toe - t) : t, left = FULL - low
  return left < toe ? FULL - (toe * toe) / (2 * toe - left) : low
}
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** The colours (0–1) of a cloud's points, written into `out`. `own`: how far its light is its own (0 a closed deck's: the
 *  model's tone). */
export function cloudTone(tones: Pick<LayerOf<'cloudSheet'>, 'lit' | 'body' | 'shade'>, own: number) {
  const ramp = new Float32Array((RAMP + 1) * 3)
  // A low sun's light comes in under the mass: its body keeps of it.
  const { lit, body } = tones, low = LOW * own * smoothstep(WARM[0], WARM[1], lit[0] - lit[2] - (body[0] - body[2])), self = own * own
  const bright = lightness(lit), hue = { lit, body: upTo(mix(body, lit, low), BODY_UP_TO * bright, HELD * own), shade: upTo(mix(tones.shade, lit, low / 2), SHADE_UP_TO * bright, HELD * own) }
  for (let n = 0; n <= RAMP; n++) ramp.set(toneOf(hue, n / RAMP), n * 3)
  // A sky whose lit and shade hardly part has no deep shade either; a dim sky's lit cloud is no sunlit crown.
  const range = UNDER * Math.min(1, 0.2 + 4 * Math.max(0, tones.lit[1] - tones.shade[1])), over = CROWN * tones.lit[1] ** 2
  return (p: CloudPoint, out: Float32Array) => {
    const { tone, near, light } = p
    const heads = p.relief * RELIEF * self * Math.min(1, 1.6 * p.thick) * (IN_SHADE + (1 - IN_SHADE) * light)
    // Far off and in a closed deck it is the model's tone, a far heap's a little lighter: its crowns are too small to see.
    const far = tone * (1 - FAR_CROWNS * own), there = far + near * own * (MODEL_SHARE * tone + p.shade + heads - far + EDGE * p.flat - WALL * p.wall)
    const place = within(there, own * near)
    const n = Math.round(Math.min(1, place) * RAMP) * 3, under = range * self * near * Math.max(0, place - UNDER_FROM)
    const crown = 1 + over * CROWN_TO * clamp(((0.4 - there) * 2.4) / CROWN_TO) * (0.35 + 0.65 * light) * near * own
    out[0] = Math.min(1, ramp[n] * (1 - under) * crown)
    out[1] = Math.min(1, ramp[n + 1] * (1 - 0.85 * under) * crown)
    out[2] = Math.min(1, ramp[n + 2] * (1 - 0.65 * under) * crown)
  }
}

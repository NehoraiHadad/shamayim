import type { LayerOf } from '../../../model/types'
import { toneOf } from '../../shared/cloud/deck'

/*
 * A point of cloud's colour, one hand for sheets and towers: its place between the model's lit and shade colours by the
 * light that reaches it (the sun's, the sky's), its base and its heads, and over the lit one on a crown. The model's lit,
 * body and shade make the range; the light says where on it a point stands, and a little past its ends.
 */

/** How far the model's tone, the cloud's own light and the flat base place a point between lit and shade. */
const MODEL_SHARE = 0.34, OWN_SHADE = 0.7, BASE = 0.42
/** The share of the direct light in the light on a point at its full strength (the rest the open sky's, from above). */
const FROM_SUN = 0.68
/** How strongly a head's side toward the light and its far side part, and what of it is left deep in the mass's shade. */
const RELIEF = 0.85, IN_SHADE = 0.45
/** How far over the model's lit colour the brightest crowns stand, as light (the model's lit is a mass's mean). */
const CROWN = 0.24
/** How far under the model's shade the deepest shade stands (its red the most: a shade is lit by the sky), from which place. */
const UNDER = 0.26, UNDER_FROM = 0.5
/** How far a hole's far wall stands toward the lit colour, and its near edge's underside toward the shade. */
const WALL = 0.7, EDGE = 0.3
/** Steps of the model's ramp from lit to shade, and the place past its end a shade may stand at. */
const RAMP = 255, FULL = 1.1

export interface CloudPoint {
  /** The model's tone, the direct light and the sky's through the cloud, the depth inside the mass, the base. */
  tone: number; sun: number; sky: number; deep: number; base: number
  /** How far a head faces away from the light, and how thick the cloud is. */
  relief: number; thick: number
  /** What distance leaves of the contrast; how far the cloud's light is its own (0 a closed deck's, the model's tone). */
  near: number; own: number
  /** How far it is a hole's far wall, and the straight edge of an underside (0–1). */
  wall: number; flat: number
}

export const cloudPoint = (): CloudPoint =>
  ({ tone: 0, sun: 1, sky: 1, deep: 0, base: 0, relief: 0, thick: 0, near: 1, own: 0, wall: 0, flat: 0 })

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** The colours (0–1) of a cloud's points, written into `out`. `beam`: how much of the light is direct, 0–1. */
export function cloudTone(tones: Pick<LayerOf<'cloudSheet'>, 'lit' | 'body' | 'shade'>, beam: number) {
  const ramp = new Float32Array((RAMP + 1) * 3)
  for (let n = 0; n <= RAMP; n++) ramp.set(toneOf(tones, n / RAMP), n * 3)
  const direct = FROM_SUN * beam
  // A sky whose lit and shade hardly part has no deep shade either; a dim sky's lit cloud is no sunlit crown.
  const range = UNDER * Math.min(1, 0.2 + 4 * Math.max(0, tones.lit[1] - tones.shade[1])), over = CROWN * tones.lit[1] ** 2
  return (p: CloudPoint, out: Float32Array) => {
    const { tone, near, own } = p, light = direct * p.sun + (1 - direct) * p.sky, self = own * own, dark = Math.max(0, 1 - light)
    const heads = p.relief * RELIEF * self * Math.min(1, 1.6 * p.thick) * (IN_SHADE + (1 - IN_SHADE) * p.sun)
    const shaded = MODEL_SHARE * tone * (0.5 + 0.5 * near) + near
      * (OWN_SHADE * dark * Math.sqrt(Math.sqrt(dark)) * (0.45 + 0.55 * p.deep) + BASE * p.base * (0.4 + 0.6 * p.deep) + heads - 0.2 * light)
    const there = tone + (shaded - tone) * own * (0.15 + 0.85 * own) + near * own * (EDGE * p.flat - WALL * p.wall)
    const place = there < 0 ? 0 : there > FULL ? FULL : there
    const n = Math.round(Math.min(1, place) * RAMP) * 3, under = range * self * near * Math.max(0, place - UNDER_FROM)
    const crown = 1 + over * clamp((0.4 - place) * 2.4) * (0.35 + 0.65 * light) * near * own
    out[0] = Math.min(1, ramp[n] * (1 - under) * crown)
    out[1] = Math.min(1, ramp[n + 1] * (1 - 0.85 * under) * crown)
    out[2] = Math.min(1, ramp[n + 2] * (1 - 0.65 * under) * crown)
  }
}

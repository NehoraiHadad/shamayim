import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { mix } from '../../../../src/scene/paint/shared/base/hand'
import { toneOf } from '../../../../src/scene/paint/shared/cloud/deck'

/*
 * A point of cloud's colour, one hand for sheets and towers: its place between the model's lit and shade colours by the
 * light that reaches it (the sun's, the sky's), its base and its heads, and over the lit one on a crown. The model's lit,
 * body and shade make the range; the light says where on it a point stands, and a little past its ends.
 */

/** How far the model's tone, this raster's own light and the flat base place a point between lit and shade. */
const MODEL_SHARE = 0.34, OWN_SHADE = 0.8, BASE = 0.5
/** The share of the sun's light in the light on a point (the rest the open sky's, from above). */
const FROM_SUN = 0.68
/** How strongly a head's side toward the light and its far side part, and what of it is left deep in the mass's shade. */
const RELIEF = 0.85, IN_SHADE = 0.45
/** How far over the model's lit colour the brightest crowns stand, as light (the model's lit is a mass's mean). */
const CROWN = 0.24
/** How far under the model's shade the deepest shade stands (its red the most: a shade is lit by the sky), from which place. */
const UNDER = 0.42, UNDER_FROM = 0.5
/** How far a hole's far wall stands toward the lit colour, and its near edge's underside toward the shade. */
const WALL = 0.7, EDGE = 0.3

export interface CloudPoint {
  /** The model's tone, the sun's light and the sky's through the cloud, the depth inside the mass, the base. */
  tone: number; sun: number; sky: number; deep: number; base: number
  /** How far a head faces away from the light, and how thick the cloud is. */
  relief: number; thick: number
  /** What distance leaves of the contrast; how far the cloud's light is its own (0 a closed deck's, the model's tone). */
  near: number; own: number
  /** How far it is a hole's far wall, the sun let in on it, and how far the straight edge of an underside (0–1). */
  wall: number; flat: number
}

export function cloudTone(ramp: Pick<LayerOf<'cloudSheet'>, 'lit' | 'body' | 'shade'>, p: CloudPoint): RGB {
  const light = FROM_SUN * p.sun + (1 - FROM_SUN) * p.sky
  const heads = p.relief * RELIEF * p.own ** 2 * Math.min(1, 1.6 * p.thick) * (IN_SHADE + (1 - IN_SHADE) * p.sun)
  const shaded = MODEL_SHARE * p.tone * (0.5 + 0.5 * p.near)
    + p.near * (OWN_SHADE * (1 - light) ** 1.2 * (0.45 + 0.55 * p.deep) + BASE * p.base * (0.4 + 0.6 * p.deep) + heads - 0.2 * light)
  const there = p.tone + (shaded - p.tone) * (0.25 + 0.75 * p.own) + p.near * (EDGE * p.flat - WALL * p.wall)
  const place = Math.min(1.2, Math.max(0, there))
  // A sky whose lit and shade hardly part has no deep shade either.
  const range = Math.min(1, 0.2 + 4 * Math.max(0, ramp.lit[1] - ramp.shade[1]))
  const [r, g, b] = toneOf(ramp as LayerOf<'cloudSheet'>, place), under = UNDER * range * p.own * p.near * Math.max(0, place - UNDER_FROM)
  const rgb: RGB = [r * (1 - under), g * (1 - 0.85 * under), b * (1 - 0.65 * under)]
  const crown = Math.min(1, Math.max(0, (0.4 - place) * 2.4)) * (0.35 + 0.65 * light) * p.near * Math.max(p.own, p.wall)
  // A dim sky's lit cloud is no sunlit crown.
  const over = 1 + CROWN * ramp.lit[1] ** 2, bright = (c: number) => Math.min(1, c * over)
  return mix(rgb, [bright(rgb[0]), bright(rgb[1]), bright(rgb[2])], crown)
}

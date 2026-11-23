import type { LayerOf, RGB } from '../../../../src/scene/model/types'
import { mix } from '../../../../src/scene/paint/shared/base/hand'
import { toneOf } from '../../../../src/scene/paint/shared/cloud/deck'

/*
 * A point of cloud's colour, one hand for sheets and towers: its place between the model's lit and shade colours by the
 * light that reaches it (the sun's, the sky's), its base and its heads, and over the lit one on a crown. The model's lit,
 * body and shade are the ends of the range; the light only says where on it a point stands.
 */

/** How far the model's tone, this raster's own light and the flat base place a point between lit and shade. */
const MODEL_SHARE = 0.34, OWN_SHADE = 0.74, BASE = 0.4
/** The share of the sun's light in the light on a point (the rest the open sky's, from above). */
const FROM_SUN = 0.58
/** How strongly a head's side toward the light and its far side part. */
const RELIEF = 0.4
/** How far over the model's lit colour the brightest crowns stand, as light (the model's lit is a mass's mean). */
const CROWN = 0.24

export interface CloudPoint {
  /** The model's tone, the sun's light and the sky's through the cloud, the depth inside the mass, the base. */
  tone: number; sun: number; sky: number; deep: number; base: number
  /** How far a head faces away from the light, and how thick the cloud is. */
  relief: number; thick: number
  /** What distance leaves of the contrast; how far the cloud's light is its own (0 a closed deck's, the model's tone). */
  near: number; own: number
}

export function cloudTone(ramp: Pick<LayerOf<'cloudSheet'>, 'lit' | 'body' | 'shade'>, p: CloudPoint): RGB {
  const light = FROM_SUN * p.sun + (1 - FROM_SUN) * p.sky
  // The heads' modelling is for the lit outside of a mass: deep in its shade there is nothing to rake.
  const heads = p.relief * RELIEF * p.own * Math.min(1, 1.6 * p.thick) * (1 - 0.8 * p.deep) * (0.35 + 0.65 * light)
  const shaded = MODEL_SHARE * p.tone * (0.5 + 0.5 * p.near)
    + p.near * (OWN_SHADE * (1 - light) ** 1.2 * (0.3 + 0.7 * p.deep) + BASE * p.base * p.deep + heads - 0.16 * light)
  const place = Math.min(0.97, Math.max(0, p.tone + (shaded - p.tone) * (0.25 + 0.75 * p.own)))
  const rgb = toneOf(ramp as LayerOf<'cloudSheet'>, place)
  const crown = Math.min(1, Math.max(0, (0.4 - place) * 2.4)) * (0.35 + 0.65 * light) * p.near * p.own
  const bright = (c: number) => Math.min(1, c * (1 + CROWN))
  return mix(rgb, [bright(rgb[0]), bright(rgb[1]), bright(rgb[2])], crown)
}

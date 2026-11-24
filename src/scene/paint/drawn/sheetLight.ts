import { smoothstep } from '../../../domain/smoothstep'
import { addLight } from '../../model/tone'
import type { LayerOf, RGB } from '../../model/types'
import { toneOf } from '../shared/cloud/deck'
import { mix } from '../shared/base/hand'
import { cloudInks, type CloudInks } from './cloudInks'
import { lowLight, whitened } from './cloudLight'
import { leanAt } from './sheetCaps'
import type { Eased } from './sheetEdge'
import { fieldAt } from './sheetField'

/*
 * The light of a broken sheet: its inks from the model's colours, and how lit each place is (0 foot … 1 lit) from its place in
 * its mass, the model's own tone there, and the side a low lamp stands on. Pure: the desc and its field.
 */

/** What a place in its mass does to its light, and what the model's own tone there does, at most. */
const SIDE = 0.6, TONE = 0.9, TONE_MOST = 0.16
/** The share of the model's own shade a sheet's body keeps where gaps light it, what it keeps more where there are few, and the cover that is; the chroma its inks take (its body is half the sky's). */
const KEEPS = 0.55, CLOSED = 0.4, COVER = [0.45, 0.8] as const, GAIN = 1.2
/** The altitudes (degrees) a lamp stands low between, what it does to the side that faces it, and how far off it is whole (of the width). */
const LOW = [8, 32] as const, ACROSS = 0.45, OFF = 0.4
/** What a low sun takes of a cap's light: it comes from below. */
const BELOW = 1.4

export interface SheetLight {
  t: CloudInks
  /** The light of a place on the field's grid, at its place in its mass. */
  at: (gx: number, gy: number, side: number) => number
  /** How far a cap's top stands in the light. */
  crest: number
  /** A colour with the towns' light on it there, by night. */
  under: (rgb: RGB, gx: number, gy: number) => RGB
}

export function sheetLight(desc: LayerOf<'cloudSheet'>, { f, alpha, wide }: Eased): SheetLight {
  const { city, lamp } = desc, low = lowLight(desc), grid = (of: Float32Array, gx: number, gy: number) => fieldAt(of, f.cols, f.rows, gx, gy)
  let solid = 0, tones = 0
  for (let n = 0; n < alpha.length; n++) { solid += alpha[n]; tones += alpha[n] * f.tone[n] }
  const mean = solid ? tones / solid : 0.5
  const body = mix(desc.lit, toneOf(desc, mean), KEEPS + CLOSED * smoothstep(COVER[0], COVER[1], solid / alpha.length))
  const t = cloudInks({ lit: desc.lit, bright: mix(whitened(desc.lit), desc.lit, low), body, shade: desc.shade, least: 0, gain: GAIN })
  // A low sun lights the feet, and the side of the sky it stands on.
  const up = SIDE * (0.7 - 0.35 * t.heavy) * (1 - 2 * low), place = lamp?.sun ?? lamp, across = place ? ACROSS * (1 - smoothstep(LOW[0], LOW[1], place.altitude)) : 0
  return {
    t,
    crest: 1 - BELOW * low,
    at: (gx, gy, side) => {
      const own = Math.min(TONE_MOST, Math.max(-TONE_MOST, TONE * (grid(f.tone, gx, gy) - mean)))
      const to = across && place ? across * Math.tanh((place.x - f.x0 - (gx / (f.cols - 1)) * f.width) / (OFF * f.width)) * leanAt(wide, f, gx, gy) : 0
      return Math.min(1, Math.max(0, 0.5 + up * side + to - own))
    },
    under: (rgb, gx, gy) => (city ? addLight(rgb, city.rgb, grid(f.city, gx, gy)) : rgb),
  }
}

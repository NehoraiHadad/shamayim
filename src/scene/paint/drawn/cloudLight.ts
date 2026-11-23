import { smoothstep } from '../../../domain/smoothstep'
import type { RGB } from '../../model/types'
import { mix } from '../shared/base/hand'

/* The drawn hand's reading of the model's light: from its tones alone, never from a time. */

/** How far a bright lit tone is taken to white (the illustration's clean lit caps). */
const WHITEN = 0.55

/** A lit tone as a cap takes it: by day nearer white, a dusk's or a night's left as it is. */
export function whitened(lit: RGB): RGB {
  return mix(lit, [1, 1, 1], WHITEN * smoothstep(0.55, 0.85, Math.min(...lit)))
}

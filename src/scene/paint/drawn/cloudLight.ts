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

/** How low the light stands, read from its own colour (0 high … 1 low): a low sun's is warm against the cloud's body. */
export function lowLight({ lit, body }: { lit: RGB; body: RGB }): number {
  return smoothstep(0.08, 0.3, lit[0] - lit[2] - (body[0] - body[2]))
}

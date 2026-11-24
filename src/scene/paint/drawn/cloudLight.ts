import { smoothstep } from '../../../domain/smoothstep'
import type { RGB } from '../../model/types'

/* The drawn hand's reading of the model's light: from its tones alone, never from a time. */

export { whitened } from '../../model/cloudPaintBounds'

/** How low the light stands, read from its own colour (0 high … 1 low): a low sun's is warm against the cloud's body. By day a
 *  warm light still comes from above. */
export function lowLight({ lit, body, daylit = 0 }: { lit: RGB; body: RGB; daylit?: number }): number {
  return (1 - daylit) * smoothstep(0.08, 0.3, lit[0] - lit[2] - (body[0] - body[2]))
}

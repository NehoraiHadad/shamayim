import type { LayerOf, RGB } from '../../../model/types'
import { mix } from '../base/hand'

/* What a cloud sheet's desc says of its deck: how open it is, and the model's colour for a tone. */

export { deckOpenness } from '../../../model/cloudPaintBounds'

/** The model's colour for a tone: lit at 0, the body at ½, the shaded underside at 1. */
export function toneOf({ lit, body, shade }: LayerOf<'cloudSheet'>, tone: number): RGB {
  const t = Math.min(1, Math.max(0, tone))
  return t < 0.5 ? mix(lit, body, t * 2) : mix(body, shade, t * 2 - 1)
}

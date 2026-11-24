import { smoothstep } from '../../../../domain/smoothstep'
import type { LayerOf, RGB } from '../../../model/types'
import { mix } from '../base/hand'

/* What a cloud sheet's desc says of its deck: how open it is, and the model's colour for a tone. */

/** Below this a node is open sky: one of the deck's gaps. */
const CLEAR = 0.05
/** Share of clear nodes over which a deck turns from closed (overcast, rain ≤ 0.03) to open (broken, showers ≈ 0.2). */
const OPEN_FROM = 0.05, OPEN_TO = 0.15

/** 0 for a closed deck (overcast, rain) or a high veil, 1 for a low or mid deck with gaps: its share of open-sky nodes. */
export function deckOpenness(desc: LayerOf<'cloudSheet'>): number {
  if (desc.lattice === 'high') return 0
  const count = desc.xs.length * desc.ys.length
  let clear = 0
  for (let n = 0; n < count; n++) if ((desc.alpha[n] ?? 0) < CLEAR) clear++
  return smoothstep(OPEN_FROM, OPEN_TO, clear / count)
}

/** The model's colour for a tone: lit at 0, the body at ½, the shaded underside at 1. */
export function toneOf({ lit, body, shade }: Pick<LayerOf<'cloudSheet'>, 'lit' | 'body' | 'shade'>, tone: number): RGB {
  const t = Math.min(1, Math.max(0, tone))
  return t < 0.5 ? mix(lit, body, t * 2) : mix(body, shade, t * 2 - 1)
}

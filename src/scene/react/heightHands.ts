import { DOT_DRAWN } from '../../world/layout'
import type { SceneStyle } from '../paint/painters'

/** How a hand letters the height and draws its dot (px); the facts are the same for both. */
export interface HeightHand {
  font: string; size: number; weight: number
  /** The dot's outline round `y`. */
  dot(y: number): string
}

const round = (y: number, r: number) => `M${-r} ${y}A${r} ${r} 0 1 1 ${r} ${y}A${r} ${r} 0 1 1 ${-r} ${y}Z`

export const HEIGHT_HANDS: Record<SceneStyle, HeightHand> = {
  real: { font: 'var(--font-sans)', size: 12, weight: 400, dot: (y) => round(y, DOT_DRAWN) },
  // A dot closed by hand.
  drawn: { font: 'var(--font-serif)', size: 13, weight: 500,
    dot: (y) => `M-2 ${y}A2 2.2 0 0 1 2.1 ${y + .2}A2.1 1.9 0 0 1 -2 ${y}Z` },
}

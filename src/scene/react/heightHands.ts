import type { SceneStyle } from '../paint/painters'

/** How a hand letters the height and draws its tick and dot (px); the facts are the same for both. */
export interface HeightHand {
  font: string; size: number; weight: number
  /** The tick's path from `top` to `bottom`, and its strokes: their shift aside, width and how much of them shows. */
  tick(top: number, bottom: number): string
  strokes: { dx: number; width: number; alpha: number }[]
  /** The dot's outline round `y`. */
  dot(y: number): string
}

const ring = (y: number, r: number) => `M${-r} ${y}A${r} ${r} 0 1 1 ${r} ${y}A${r} ${r} 0 1 1 ${-r} ${y}Z`

export const HEIGHT_HANDS: Record<SceneStyle, HeightHand> = {
  real: { font: 'var(--font-sans)', size: 12, weight: 600,
    tick: (top, bottom) => `M0 ${top}V${bottom}`, strokes: [{ dx: 0, width: 1.1, alpha: .9 }],
    dot: (y) => ring(y, 2.2) },
  // A pencil: one swaying stroke gone over again, and a dot closed by hand.
  drawn: { font: 'var(--font-serif)', size: 13, weight: 500,
    tick: (top, bottom) => `M.3 ${top}Q-.5 ${(top + bottom) / 2} .1 ${bottom}`,
    strokes: [{ dx: 0, width: 1.1, alpha: .85 }, { dx: .4, width: .6, alpha: .5 }],
    dot: (y) => `M-2.2 ${y}A2.2 2.4 0 0 1 2.3 ${y + .2}A2.3 2.1 0 0 1 -2.2 ${y}Z` },
}

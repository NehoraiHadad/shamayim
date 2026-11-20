/**
 * What the clothesline needs to know of each garment (`wear.ts`), in the garment's own frame: (0, 0) is where the rope
 * passes, y grows down, about 34 units across a shirt. Its shapes are the painter's (`paint/wear.ts`), drawn in the same
 * frame. The garments and their choice are the tip's (`text/wear.ts`); these are the ones the line has always drawn.
 */
export interface Hanging {
  /** Peg points along the rope (x); none for a thing hung by a hook. */
  pegs: number[]
  /** Hangs by a hook (umbrella, bottle) or a loop (hat): it swings from it, plumb. */
  hook?: boolean
  /** The cloth's own colour, before the paper, the light and the weather. */
  cloth: string
  /** How hard it pulls the line down: about 1 for a shirt. */
  weight: number
  /** Two-peg tops: where the hem hangs (y), so the gravity folds fall from the pegs toward it. */
  hem?: number
  /** Where it drips from in the rain (garment units). */
  drips: [number, number][]
  /** Hooked things: the stretch of rope (x) that runs in front of the hook's far arm. */
  over?: [number, number]
  /** The sprite's extent, pegs included: [x0, y0, x1, y1]. */
  box: [number, number, number, number]
}

export const HANGING = {
  tee: { cloth: '#E0A040', weight: 0.8, hem: 33, pegs: [-8, 8], drips: [[-6, 34], [5, 34]], box: [-17.5, -6, 17.5, 35] },
  longSleeve: { cloth: '#7FA2BC', weight: 0.9, hem: 35, pegs: [-8, 8], drips: [[-18.6, 30.6], [4, 36]], box: [-22, -6, 22, 37] },
  sweater: { cloth: '#B0543A', weight: 1.4, hem: 33, pegs: [-8.5, 8.5], drips: [[-18.5, 31], [-6, 37], [7, 37]], box: [-22.5, -6, 22.5, 38.5] },
  jacket: { cloth: '#2C6E7F', weight: 1.4, hem: 36, pegs: [-8.5, 8.5], drips: [[-18.8, 31], [6, 36.5]], box: [-22.5, -6, 22.5, 37.5] },
  coat: { cloth: '#7A6650', weight: 1.9, hem: 48.5, pegs: [-9, 9], drips: [[-19.2, 33], [-7, 49], [8, 49]], box: [-23, -6, 23, 50] },
  umbrella: { cloth: '#2A6AA8', weight: 1.1, pegs: [], hook: true, drips: [[-2.1, 44.6]], over: [-4.4, -1.4], box: [-9, -5, 9, 48] },
  rainJacket: { cloth: '#E8C230', weight: 1.1, hem: 33.5, pegs: [-8.5, 8.5], drips: [[-6, 35.6], [7, 35.4], [-17.8, 29.4]],
    box: [-21.5, -6, 21.5, 36.5] },
  sunHat: { cloth: '#CDAE7C', weight: 0.5, pegs: [], hook: true, drips: [[-12, 24], [11, 24]], over: [-2.6, -0.4], box: [-16.5, -2.5, 16.5, 28] },
  water: { cloth: '#7FD3EE', weight: 1.3, pegs: [], hook: true, drips: [[0, 32.4]], over: [-4.2, -1.8], box: [-7.5, -3, 7.5, 33.5] },
} satisfies Record<string, Hanging>

export type WearGarment = keyof typeof HANGING

export const hangingOf = (garment: string): Hanging | null => (HANGING as Record<string, Hanging>)[garment] ?? null

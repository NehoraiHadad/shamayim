import type { ReactNode } from 'react'
import type { Garment } from '../../text/wear'
import { GEAR } from './gear'
import { TOPS } from './tops'

/**
 * Hand-drawn garments as they hang on a line. Local coords: (0, 0) is where the line passes, things hang down
 * (y grows). Each entry lists its peg points so the pegs sit on the cloth, not in the air.
 */
export interface Hanging {
  body: ReactNode
  pegs: number[]
  /** Cloth colour, washed into the paper (light or dark) at a low share. */
  cloth: string
  /** Hangs by a hook (umbrella, bottle): no pegs, the line passes through the hook. */
  hook?: boolean
  /** Points where rain gear drips from (local coords). */
  drips?: [number, number][]
  /** How hard it pulls the line down, about 1 for a shirt (default 1). */
  weight?: number
}

export const GARMENTS: Record<Garment, Hanging> = { ...TOPS, ...GEAR }

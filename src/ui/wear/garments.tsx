import type { ReactNode } from 'react'
import type { Garment } from '../../text/wear'

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
}

const NECK = 'M-6 1.2Q0 6.5 6 1.2'

export const GARMENTS: Record<Garment, Hanging> = {
  // Short sleeves stick out, a chest pocket; the neck dips where the pegs pull the shoulders.
  tee: {
    cloth: '#E0A040',
    pegs: [-8, 8],
    body: (
      <>
        <path d="M-8 1L-17 6.5-14.2 13.5-10.4 11.6V33Q0 34.6 10.4 33V11.6L14.2 13.5 17 6.5 8 1Q0 7-8 1Z" />
        <path d={NECK} className="seam" />
        <path d="M3.6 14.5h4.8v4.6h-4.8z" className="seam" />
      </>
    ),
  },
  // Thin long sleeve: the sleeves fall straight down beside the body, narrow cuffs.
  longSleeve: {
    cloth: '#7FA2BC',
    pegs: [-8, 8],
    body: (
      <>
        <path d="M-8 1L-17 5-20.5 29.5-16.6 30.4-11 13V35Q0 36.4 11 35V13L16.6 30.4 20.5 29.5 17 5 8 1Q0 7-8 1Z" />
        <path d={NECK} className="seam" />
        <path d="M-20.2 27.4l3.9.9M20.2 27.4l-3.9.9" className="seam" />
      </>
    ),
  },
  // Knit sweater: rounder, heavier, ribbed hem and cuffs, a double crew neck.
  sweater: {
    cloth: '#B0543A',
    pegs: [-8.5, 8.5],
    body: (
      <>
        <path d="M-8.5 1Q-15 2.5-18 7L-21 29.6-16 31-12 15V35.5Q0 37.5 12 35.5V15L16 31 21 29.6 18 7Q15 2.5 8.5 1Q0 7.5-8.5 1Z" />
        <path d={NECK} className="seam" />
        <path d="M-7.2 2.6Q0 9 7.2 2.6" className="seam" />
        <path d="M-12 32.4Q0 34.4 12 32.4M-8 33.4v2.8M-4 33.8v2.9M0 34v3M4 33.8v2.9M8 33.4v2.8" className="seam" />
        <path d="M-20.6 26.8l4.5 1.4M20.6 26.8l-4.5 1.4" className="seam" />
      </>
    ),
  },
  // Zip jacket: stand collar, a zip down the middle, two slanted pockets.
  jacket: {
    cloth: '#2C6E7F',
    pegs: [-8.5, 8.5],
    body: (
      <>
        <path d="M-8.5 1L-18 5.5-21 30-16.6 31-12.4 14V36H12.4V14L16.6 31 21 30 18 5.5 8.5 1-6 1Z" />
        <path d="M-6 1L-5 -2H5L6 1" className="seam" />
        <path d="M0 -2V36" className="seam" />
        <path d="M-9.5 24l3.5-3M9.5 24l-3.5-3" className="seam" />
      </>
    ),
  },
  // Long coat: past the knees, lapels, two buttons, a belt.
  coat: {
    cloth: '#7A6650',
    pegs: [-9, 9],
    body: (
      <>
        <path d="M-9 1L-18.5 6-21.5 32-17 33-13 15V48.5H13V15L17 33 21.5 32 18.5 6 9 1Z" />
        <path d="M-9 1L-2 14 0 22M9 1L2 14 0 22V48.5" className="seam" />
        <path d="M-13 30H13" className="seam" />
        <circle cx="-3" cy="25.5" r="1" className="dot" />
        <circle cx="-3" cy="36" r="1" className="dot" />
      </>
    ),
  },
  // Closed umbrella hung by its crook: handle over the line, furled canopy, tip at the bottom.
  umbrella: {
    cloth: '#2A6AA8',
    pegs: [],
    hook: true,
    body: (
      <>
        <path d="M-5 4.5A4.6 4.6 0 0 1 4.2 -1.5V8" className="seam strong" />
        <path d="M4.2 8C-1.5 14-1.8 33 3.4 41.5 4 42.4 4.4 42.4 5 41.5 10.2 33 9.9 14 4.2 8Z" />
        <path d="M4.2 11C2 18 2.3 31 4.2 38M4.2 11C6.6 20 7 29 5.6 36" className="seam" />
        <path d="M4.2 42v3" className="seam strong" />
      </>
    ),
  },
  // Light rain jacket: a hood falling back behind the neck, drawstrings.
  rainJacket: {
    cloth: '#E8C230',
    pegs: [-8.5, 8.5],
    body: (
      <>
        <path d="M-8.5 1L-17.5 5.5-20 28-16 29-12 13V33.5Q0 35.5 12 33.5V13L16 29 20 28 17.5 5.5 8.5 1Z" />
        <path d="M-7 2Q-6.5 13 0 13.5 6.5 13 7 2" className="seam" />
        <path d="M-2.5 13.4v5.5M2.5 13.4v4.4" className="seam" />
        <path d="M0 13.5V33.5" className="seam" />
      </>
    ),
  },
  // Sun hat pegged by its brim: wide brim, a band round the crown.
  sunHat: {
    cloth: '#CDAE7C',
    pegs: [0],
    body: (
      <>
        <path d="M-15 12.5Q-14 6.5 0 6.2 14 6.5 15 12.5 9 16.5 0 16.5-9 16.5-15 12.5Z" />
        <path d="M-8 10.8Q-8.2 1.5 0 1.2 8.2 1.5 8 10.8" />
        <path d="M-8 8.6Q0 10.6 8 8.6" className="seam" />
        <path d="M0 6.2V1.2" className="seam" />
      </>
    ),
  },
  // Water bottle hanging by the loop of its cap; a line for the water inside.
  water: {
    cloth: '#7FD3EE',
    pegs: [],
    hook: true,
    body: (
      <>
        <path d="M-2.4 3.8A3 3 0 1 1 2.4 3.8" className="seam strong" />
        <path d="M-2.6 4H2.6V7.5Q6 9.5 6 13V30Q6 32 4 32H-4Q-6 32-6 30V13Q-6 9.5-2.6 7.5Z" />
        <path d="M-6 17Q-3 15.8 0 17T6 17" className="seam" />
      </>
    ),
  },
}

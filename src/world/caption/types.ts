import type { Point } from '../layout'
import type { Pt } from '../typesAtmo'

/**
 * Three ways (design options, dev switch `?label=a|b|c`) for the place's height and its real spot to read as one thing
 * with the place: `a` an inscription over its roofs, `b` a line along its feet, `c` a benchmark on the ground at its foot.
 */
export const CAPTION_OPTIONS = ['a', 'b', 'c'] as const
export type CaptionOption = typeof CAPTION_OPTIONS[number]

/** The caption's facts: x in reference px (375), y and sizes in screen px. Every hand draws the same ones. */
export interface Caption {
  option: CaptionOption
  /** The place's name, when the caption says it. */
  name: string | null
  height: string
  /** The lettering's box: its centre, its top and its size. */
  x: number; y: number; w: number; h: number
  /** The lettering's fall to the right (radians): it lies along the ground. */
  slope: number
  /** What lies behind the lettering. */
  on: 'sky' | 'land'
  /** The real spot (the place's point on its own scale). */
  spot: Point
  /** A short upright stroke in the spot's column. */
  tick: { top: number; bottom: number } | null
  /** The line along the feet of the place's own linked houses. */
  line: Pt[] | null
  /** The benchmark's place in the lettering's box: px from its centre. */
  markDx: number | null
}

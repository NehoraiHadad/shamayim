import type { DatumLine } from '../data/terrain/sceneNotes'
import type { Pt } from './types'

/**
 * The "פני הים" datum below sea level, on the picture's own vertical rule (the outside view's, `world/outside.ts` `lieOf`).
 *
 * The place is drawn from outside on one vertical scale (owner decision 14, "uniform per place"): every spot of its ground
 * above or below the dot by its height over the place point's, `s` px a metre alike above and below, and the dot itself
 * under the near ridge's crest by the crest's height over it on the same scale. Sea level is a height like any other, so
 * it stands `|h0| × s` over the dot (at the dot's depth): `seaLevelY` of the outside view, one number. The dashed line
 * stands there along the dot's own row, in front of the land behind the place, and on each side runs until that row's
 * ground rises through 0 m, which is where the slope reaches sea level (`datumOfRow`; a side whose ground stays below
 * 0 m ends a short way past the dot, fading out). Without the place's local ground there is no scale to draw it on: no line, no note
 * (the label, "−N מ׳", still says the place lies below sea level, and the spoken label says it in words).
 *
 * (Before decision 14 the picture had two scales, pressed apart above and below the dot, and the dot sat on the ridge
 * line whatever the crest's height, so sea level had to be found as the median of a 0 m contour drawn by that rule, or of
 * the panorama's own where the place's ground never reached it.)
 */

/** The ridge's crest height (m) at x (px at 375), linearly between its points; NaN where not known. */
export function ridgeHeightAt(points: readonly Pt[], heights: readonly number[] | undefined): (x: number) => number {
  return (x) => {
    if (!heights?.length || !points.length) return Number.NaN
    const i = points.findIndex(([px]) => px >= x)
    if (i <= 0) return heights[i < 0 ? heights.length - 1 : 0]
    const t = (x - points[i - 1][0]) / (points[i][0] - points[i - 1][0])
    return heights[i - 1] + t * (heights[i] - heights[i - 1])
  }
}

/** One stretch of the datum's dashed line (px at 375); an end where no land meets it fades out over this many px (0: none). */
export interface DatumSegment { x1: number; x2: number; fadeLeft: number; fadeRight: number }

/**
 * The datum (px at 375): its height, its segments, and the one through the dot's hollow (`x1`, `x2`), which its note
 * stands over (on the hollow's open side, away from the place, as `sceneNotes` places it).
 */
export interface Datum extends DatumLine { segments: DatumSegment[] }

/**
 * Where the dot's hollow meets no land on a side, the line reaches this far past the dot and fades out (px at 375):
 * about 1.5 × the note's width (44 px).
 */
export const OPEN_REACH = 66
/** The open end's fade: over the outer part of its reach past the dot (px at 375). */
const FADE = 40
/** The note's width (px at 375: "פני הים" at the notes' type). */
const NOTE_W = 44

/**
 * The datum's dashed line (px at 375) at sea level's height `y`, through the dot (`midX`) along the dot's own row: on each
 * side it ends where that row's ground rises through 0 m (`left`, `right`: the screen x of the nearest crossing on that
 * side, from `outside.ts` `zeroAlongRow`), which is where the slope reaches sea level; a side whose ground stays below
 * 0 m as far as it is known (the lake, the valley floor) ends `OPEN_REACH` past the dot, fading out, the fades leaving the
 * note's width solid where they can. One segment: the line is at the dot's depth, in front of the land behind the place.
 */
export function datumOfRow(y: number, midX: number, ends: { left: number | null; right: number | null }): Datum {
  const x1 = ends.left ?? Math.max(0, midX - OPEN_REACH)
  const x2 = ends.right ?? Math.min(375, midX + OPEN_REACH)
  const open = (ends.left === null ? 1 : 0) + (ends.right === null ? 1 : 0)
  const fade = open ? Math.max(0, Math.min(FADE, (x2 - x1 - NOTE_W) / open)) : 0
  const seg: DatumSegment = { x1, x2, fadeLeft: ends.left === null ? fade : 0, fadeRight: ends.right === null ? fade : 0 }
  return { x1, x2, y, segments: [seg] }
}

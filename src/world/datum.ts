import type { DatumLine } from '../data/terrain/sceneNotes'
import type { Pt } from './types'

/**
 * The "פני הים" datum below sea level, on the picture's own vertical rule (the outside view's, `world/outside.ts` `lieOf`).
 *
 * The place is drawn from outside: its point (the dot) on the ridge line, every other spot of its ground above or below
 * it by its height over the place point's, in the frame's perspective (`levelY`). Sea level is a height like any other, so
 * it is drawn by the same rule: where the place's own ground crosses 0 m (its 0 m contour), at the y `levelY` gives 0 m
 * there. The dashed line stands at that height (the contour's median y) and runs from the hollow under it until it
 * meets the drawn land rising through it, which is where the slopes reach 0 m (`datumLineOf`: only where land really
 * crosses it; a side of the dot's hollow that meets none ends a short way past the dot, fading out).
 *
 * Where the place's own ground never reaches 0 m within its frame (a village on the valley floor), the land the line is
 * cut against is the land round it, which the panorama draws at its true height from the place's eye: sea level is
 * where the eye sees that land pass up through 0 m, above the dot (`seaLevelAbove`). Where neither reaches 0 m above the dot, there is
 * no slope to cut it on: no line and no note (the label, "−N מ׳", still says the place lies below sea level, and the
 * spoken label says it in words).
 *
 * (The panorama's own sea line, `terrain.seaY`, is 0 m seen from the place's eye on the far ridges: true for that eye,
 * but the dot is drawn on the ridge line, not at eye level, so against the dot it fell far below it: Tiberias's line lay
 * by the lake, 137 m under a town that stands 137 m below it.)
 */

/** A spot of the place's ground, km east and north of the place point. */
export interface Spot { dx: number; dy: number }

/**
 * Where the ground crosses 0 m: between each two neighbouring spots of a grid over `box` (km, every `step`) on either side
 * of it, linearly between them. `keep` (the place's own boundary) must hold both spots.
 */
export function zeroCrossings(heightAt: (dx: number, dy: number) => number | null, box: { w: number; e: number; s: number; n: number },
  step: number, keep?: (dx: number, dy: number) => boolean): Spot[] {
  const out: Spot[] = []
  const held = (dx: number, dy: number) => !keep || keep(dx, dy)
  for (let dy = box.s; dy <= box.n + 1e-9; dy += step) {
    for (let dx = box.w; dx <= box.e + 1e-9; dx += step) {
      const h = heightAt(dx, dy)
      if (h === null || !held(dx, dy)) continue
      for (const [ex, ey] of [[step, 0], [0, step]]) {
        if (dx + ex > box.e + 1e-9 || dy + ey > box.n + 1e-9 || !held(dx + ex, dy + ey)) continue
        const h2 = heightAt(dx + ex, dy + ey)
        if (h2 === null || (h < 0) === (h2 < 0) || h === h2) continue
        const t = h / (h - h2)
        out.push({ dx: dx + t * ex, dy: dy + t * ey })
      }
    }
  }
  return out
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length / 2
  return sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Sea level in the picture: the 0 m contour it is drawn from (x, y), and the line's height (their median). */
export interface SeaLevel { y: number; points: Pt[] }

/** The place's 0 m contour (`zeroCrossings`) drawn by the place's own rule: across by `xOf`, up by `levelY` at 0 m. */
export function placeContour(crossings: readonly Spot[], xOf: (dx: number, dy: number) => number,
  levelY: (dx: number, dy: number, h: number) => number): Pt[] {
  return crossings.map(({ dx, dy }): Pt => [xOf(dx, dy), levelY(dx, dy, 0)])
}

/**
 * Sea level from a 0 m contour as drawn: its spots above the dot (sea level stands over a place below it; a spot under
 * the dot is a slope the rule draws lower for its nearness, or a place not truly below sea level), the line at their
 * median height; null where none is. Used for the place's own contour (`placeContour`), else the land round it as the
 * panorama draws it (`terrain.zeroContour`: the near ridge's crest or face, a far slope, as the place's eye sees them).
 */
export function seaLevelAbove(contour: readonly Pt[] | undefined, dot: { y: number }): SeaLevel | null {
  const points = (contour ?? []).filter(([, y]) => y < dot.y)
  return points.length ? { y: median(points.map(([, y]) => y)), points } : null
}

/** A point of the drawn land's top edge: x and y (px at 375), and the land's height there (m; NaN: not known). */
export type OutlinePt = readonly [number, number, number]

/**
 * The drawn land's top edge (px at 375, every px across) and its height (m): the near ridge (`ridge`, y at layout x;
 * `ridgeM`, the crest's height at x at 375) and, where it rises over it, the place's own land (`land`, its top at layout
 * px, `landM` its crest's height at each top point).
 */
export function outlineOf(ridge: (x: number) => number, land: readonly Pt[] | null | undefined, width: number,
  ridgeM: (x: number) => number = () => Number.NaN, landM: readonly number[] = []): OutlinePt[] {
  const own = new Map<number, [number, number]>()
  ;(land ?? []).forEach(([x, y], i) => {
    const at = own.get(Math.round(x))
    if (!at || y < at[0]) own.set(Math.round(x), [y, landM[i] ?? Number.NaN])
  })
  const out: OutlinePt[] = []
  for (let x = 0; x <= Math.ceil(width); x++) {
    const x375 = x * 375 / width, y = ridge(x), mine = own.get(x)
    out.push(mine && mine[0] < y ? [x375, mine[0], mine[1]] : [x375, y, ridgeM(x375)])
  }
  return out
}

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

/** Run a few px on into the land at a crossing (hidden behind it), so the dash rhythm never leaves a gap at the flank. */
const TUCK = 6
/**
 * Where the dot's hollow meets no land on a side, the line reaches this far past the dot and fades out (px at 375):
 * about 1.5 × the note's width (44 px).
 */
export const OPEN_REACH = 66
/** The open end's fade: over the outer part of its reach past the dot (px at 375). */
const FADE = 40
/** The note's width (px at 375: "פני הים" at the notes' type). */
const NOTE_W = 44
/** A hollow narrower than this (px at 375) carries no stretch of the line. */
const MIN_HOLLOW = 4

/**
 * The datum's dashed line at sea level's height, only where the drawn land (`outline`, west to east, px at 375) really
 * crosses it (land drawn through the line whose height there is below 0 m is not a crossing: the line runs on behind it): a segment through each hollow under it from one crossing to the next on its other side (tucked into the
 * land). A hollow open to the frame's edge on a side has no crossing there: the dot's own hollow then ends that side
 * `OPEN_REACH` past the dot, fading out; any other open hollow carries none. Null where no segment is left.
 */
export function datumLineOf(seaLevel: SeaLevel, outline: readonly OutlinePt[], midX: number): Datum | null {
  const y = seaLevel.y
  // Under the line: land drawn lower than it, or land truly below sea level wherever it is drawn (the line passes
  // behind it, hidden): only land that reaches 0 m bounds a hollow.
  const under = (p: OutlinePt) => p[1] > y || p[2] < 0
  const edge = (p: OutlinePt, q: OutlinePt) => {
    if ((p[1] > y) !== (q[1] > y) && p[1] !== q[1]) return p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1])
    return p[2] !== q[2] && Number.isFinite(p[2] + q[2]) ? p[0] + (q[0] - p[0]) * (0 - p[2]) / (q[2] - p[2]) : (p[0] + q[0]) / 2
  }
  // The hollows: stretches under the line, each end a crossing or the frame's edge.
  const hollows: { from: number | null; to: number | null; a: number; b: number }[] = []
  let open: { from: number | null; a: number } | null = outline.length && under(outline[0]) ? { from: null, a: outline[0][0] } : null
  for (let i = 1; i < outline.length; i++) {
    const [p, q] = [outline[i - 1], outline[i]]
    if (!under(p) && under(q)) { const x = edge(p, q); open = { from: x, a: x } }
    else if (under(p) && !under(q) && open) { const x = edge(p, q); hollows.push({ from: open.from, to: x, a: open.a, b: x }); open = null }
  }
  if (open) hollows.push({ from: open.from, to: null, a: open.a, b: outline.at(-1)![0] })
  const segments: DatumSegment[] = []
  let main: DatumSegment | null = null
  for (const h of hollows) {
    const holdsDot = h.a <= midX && midX <= h.b
    if (!holdsDot && (h.from === null || h.to === null)) continue
    const seg: DatumSegment = {
      x1: h.from !== null ? h.from - TUCK : Math.max(h.a, midX - OPEN_REACH),
      x2: h.to !== null ? h.to + TUCK : Math.min(h.b, midX + OPEN_REACH),
      fadeLeft: 0, fadeRight: 0,
    }
    // The fades leave the note's width solid between them where the segment allows.
    const ends = (h.from === null ? 1 : 0) + (h.to === null ? 1 : 0)
    const fade = ends ? Math.max(0, Math.min(FADE, (seg.x2 - seg.x1 - NOTE_W) / ends)) : 0
    if (h.from === null) seg.fadeLeft = fade
    if (h.to === null) seg.fadeRight = fade
    if (h.b - h.a < MIN_HOLLOW && !holdsDot) continue
    // A hollow whose land is all drawn over the line (below sea level, so no crossing) would only be drawn hidden.
    if (!holdsDot && !outline.some(([x, py]) => x > h.a && x < h.b && py > y + .5)) continue
    segments.push(seg)
    if (holdsDot) main = seg
  }
  if (!segments.length) return null
  // The note stands over the dot's hollow; without one (land over the line at the dot), over the widest segment.
  main ??= segments.reduce((best, seg) => seg.x2 - seg.x1 > best.x2 - best.x1 ? seg : best)
  return { x1: main.x1, x2: main.x2, y, segments }
}

import type { DatumLine } from '../data/terrain/sceneNotes'
import { seaSpan } from './seaLine'
import type { Pt } from './types'

/**
 * The "פני הים" datum below sea level, on the picture's own vertical rule (the outside view's, `world/outside.ts` `lieOf`).
 *
 * The place is drawn from outside: its point (the dot) on the ridge line, every other spot of its ground above or below
 * it by its height over the place point's, in the frame's perspective (`levelY`). Sea level is a height like any other, so
 * it is drawn by the same rule: where the place's own ground crosses 0 m (its 0 m contour), at the y `levelY` gives 0 m
 * there. The dashed line stands at that height (the contour's median y) and runs from the hollow under it until it
 * meets the drawn land rising through it (`seaSpan`), which is where the slopes reach 0 m.
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

/**
 * The drawn land's top edge (px at 375, every px across): the near ridge (`ridge`, y at layout x) and, where it rises over
 * it, the place's own land (`land`, its top at layout px).
 */
export function outlineOf(ridge: (x: number) => number, land: readonly Pt[] | null | undefined, width: number): Pt[] {
  const own = new Map<number, number>()
  for (const [x, y] of land ?? []) own.set(Math.round(x), Math.min(y, own.get(Math.round(x)) ?? Infinity))
  const out: Pt[] = []
  for (let x = 0; x <= Math.ceil(width); x++) out.push([x * 375 / width, Math.min(ridge(x), own.get(x) ?? Infinity)])
  return out
}

/** The datum's dashed line (px at 375): at sea level's height, from the hollow at `midX` to the drawn land rising through it. */
export function datumLineOf(seaLevel: SeaLevel, outline: readonly Pt[], midX: number): DatumLine {
  return { ...seaSpan(outline, seaLevel.y, midX), y: seaLevel.y }
}

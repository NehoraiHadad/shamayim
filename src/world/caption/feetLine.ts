import { SCENE_W } from '../sceneBox'
import type { Pt } from '../typesAtmo'
import { CAPTION_FLOOR } from './cover'
import { INK_H, type CaptionScene } from './scene'

/** The line runs this far under the feet (px), and this far past the last house. */
const UNDER = 4, PAST = 9
/** Half the line of a place with no houses round its spot (px), and how far under the spot it lies. */
const BARE = 22, BARE_UNDER = 6
/** Px between the line's points, and half the window its bends are eased over. */
const STEP = 3, EASE = 18
/** Px the line stays inside the figure. */
const EDGE = 5

const between = ([ax, ay]: Pt, [bx, by]: Pt, x: number) => ay + (by - ay) * (x - ax) / (bx - ax || 1)

/** The line's y at a column (its ends' beyond them). */
export function lineAt(line: readonly Pt[], x: number) {
  const i = line.findIndex(([px]) => px >= x)
  return i <= 0 ? (i < 0 ? line[line.length - 1] : line[0])[1] : between(line[i - 1], line[i], x)
}

/** A thread drawn taut under the feet: it touches the lowest of them and never sags between. */
function taut(feet: readonly Pt[]): Pt[] {
  const hull: Pt[] = []
  for (const p of feet) {
    while (hull.length > 1 && between(hull[hull.length - 2], p, hull[hull.length - 1][0]) >= hull[hull.length - 1][1]) hull.pop()
    hull.push(p)
  }
  return hull
}

/** The line along the feet of the place's own linked houses, from a little before the first to a little past the last. */
export function feetLine({ extent, spot }: Pick<CaptionScene, 'extent' | 'spot'>): Pt[] {
  const feet: Pt[] = extent?.feet ?? [[spot.x - BARE, spot.y + BARE_UNDER], [spot.x + BARE, spot.y + BARE_UNDER]]
  const thread = taut(feet)
  const from = Math.max(EDGE, feet[0][0] - PAST), to = Math.min(SCENE_W - EDGE, feet[feet.length - 1][0] + PAST)
  const count = Math.max(2, Math.ceil((to - from) / STEP))
  return Array.from({ length: count + 1 }, (_, i): Pt => {
    const x = from + (to - from) * i / count
    let sum = 0
    for (let d = -EASE; d <= EASE; d += STEP) sum += lineAt(thread, x + d)
    return [x, Math.min(sum / (2 * EASE / STEP + 1) + UNDER, CAPTION_FLOOR - INK_H / 2)]
  })
}

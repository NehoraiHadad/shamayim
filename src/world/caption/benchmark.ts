import { CAPTION_FLOOR, fits, least, type Scored } from './cover'
import { feetLine, lineAt } from './groundLine'
import { AIR, INK_H, letterWidth, type CaptionScene } from './scene'
import type { Caption } from './types'

/** The benchmark's width (px) and the gap to its figure. */
export const MARK_W = 8
const GAP = 4
/** The lettering leans with the ground no more than this. */
const LEAN = Math.tan(7 * Math.PI / 180)

/** Option c: a survey benchmark on the ground at the place's foot, its height lettered on the land beside it, along the slope. */
export function benchmark(scene: CaptionScene): Caption {
  const { spot, cover, onLand } = scene
  const line = feetLine(scene)
  const w = letterWidth(scene.height) + GAP + MARK_W
  const [left] = line[0], [right] = line[line.length - 1]
  const list: Scored<{ x: number; y: number; h: number; slope: number; markDx: number }>[] = []
  // The mark stands right of the figure (it is read first) or, where that is freer, left of it.
  for (const side of [1, -1]) {
    const markDx = side * (w - MARK_W) / 2
    for (let mark = Math.ceil(left - w); mark <= right + w; mark++) {
      const x = mark - markDx, x0 = x - w / 2, x1 = x + w / 2
      const slope = Math.max(-LEAN, Math.min(LEAN, (lineAt(line, x1) - lineAt(line, x0)) / w))
      const rise = Math.abs(slope) * w / 2, h = INK_H + 2 * rise
      let mid = -Infinity
      for (let px = x0; px <= x1; px += 2) mid = Math.max(mid, lineAt(line, px) - slope * (px - x))
      // Past the last house it lies level with the line's end, else under the line.
      const past = x0 >= right || x1 <= left
      const y = (past ? mid - INK_H / 2 : mid + AIR - 1) - rise
      if (!fits({ x, y, w, h })) continue
      list.push({ at: { x, y, h, slope, markDx }, cover: cover({ x, y, w, h }),
        cost: Math.abs(mark - spot.x) + (side < 0 ? .5 : 0) })
    }
  }
  const { x, y, h, slope, markDx } = least(list)?.at
    ?? { x: spot.x, y: CAPTION_FLOOR - INK_H, h: INK_H, slope: 0, markDx: (w - MARK_W) / 2 }
  return { option: 'c', name: null, height: scene.height, x, y, w, h, slope: Math.atan(slope),
    on: onLand(x, y + h / 2) ? 'land' : 'sky', spot, tick: null, line: null, markDx }
}

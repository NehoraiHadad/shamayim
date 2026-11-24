import { fits, least, type Scored } from './cover'
import { feetLine } from './feetLine'
import { along, AIR, INK_H, letterWidth, type CaptionScene } from './scene'
import type { Caption } from './types'

/** The benchmark's width (px) and the gap to its figure. */
export const MARK_W = 7
const GAP = 4
/** What a covered px of the place's houses costs, in px along the foot; and the mark's place on the figure's left. */
const HIDE = .3, LEFT = .5

/** Option c: a survey benchmark on the ground at the place's foot, under its spot, with the height lettered on the land beside it. */
export function benchmark(scene: CaptionScene): Caption {
  const { spot, cover, onLand } = scene
  const line = feetLine(scene)
  const w = letterWidth(scene.height) + GAP + MARK_W
  const list: Scored<ReturnType<typeof along> & { markDx: number }>[] = []
  // The mark stands right of the figure (it is read first) or, where that is freer, left of it.
  for (const side of [1, -1]) {
    const markDx = side * (w - MARK_W) / 2
    for (let mark = Math.ceil(line[0][0]); mark <= line[line.length - 1][0]; mark++) {
      const at = { ...along(line, mark - markDx, w, INK_H / 2 - AIR), markDx }
      if (!fits({ ...at, w })) continue
      const { fabric, ...rest } = cover({ ...at, w })
      list.push({ at, cover: { ...rest, fabric: 0 }, cost: Math.abs(mark - spot.x) + fabric * HIDE + (side < 0 ? LEFT : 0) })
    }
  }
  const { x, y, h, slope, markDx } = least(list)?.at ?? { ...along(line, spot.x, w, 0), markDx: (w - MARK_W) / 2 }
  return { option: 'c', name: null, height: scene.height, x, y, w, h, slope: Math.atan(slope),
    on: onLand(x, y + h / 2) ? 'land' : 'sky', spot, tick: null, line: null, markDx }
}

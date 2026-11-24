import type { Pt } from '../typesAtmo'
import { CAPTION_FLOOR, fits, least, type Scored } from './cover'
import { feetLine } from './feetLine'
import { along, DOWN, INK_H, letterWidth, type CaptionScene } from './scene'
import type { Caption } from './types'

/** Px of the line left on each side of the height. */
const SHOULDER = 10
/** What a covered px of the place's houses costs, in px along the line. */
const HIDE = .3

/** Option b: a line along the feet of the place's own houses, with the height set into it under the spot (as on a contour). */
export function groundLine(scene: CaptionScene): Caption {
  const { spot, cover, onLand } = scene
  const feet = feetLine(scene)
  const w = letterWidth(scene.height)
  const left = feet[0][0] + SHOULDER + w / 2, right = feet[feet.length - 1][0] - SHOULDER - w / 2
  const list: Scored<ReturnType<typeof along> & { down: number }>[] = []
  for (let down = 0; down <= DOWN.max; down++) {
    for (let x = Math.min(left, spot.x); x <= Math.max(right, spot.x); x++) {
      const at = { ...along(feet, x, w, down), down }
      if (!fits({ ...at, w })) continue
      const { fabric, ...rest } = cover({ ...at, w })
      list.push({ at, cover: { ...rest, fabric: 0 }, cost: Math.abs(x - spot.x) + fabric * HIDE + down * DOWN.cost })
    }
  }
  const { x, y, h, slope, down } = least(list)?.at ?? { ...along(feet, spot.x, w, 0), down: 0 }
  const line = feet.map(([px, py]): Pt => [px, Math.min(py + down, CAPTION_FLOOR - INK_H / 2)])
  return { option: 'b', name: null, height: scene.height, x, y, w, h, slope: Math.atan(slope),
    on: onLand(x, y + h / 2) ? 'land' : 'sky', spot, tick: null, line, markDx: null }
}

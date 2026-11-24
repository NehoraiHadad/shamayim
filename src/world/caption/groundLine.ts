import { fits, least, type Scored } from './cover'
import { feetLine } from './feetLine'
import { along, AIR, letterWidth, type CaptionScene } from './scene'
import type { Caption } from './types'

/** Px of the line left on each side of the height. */
const SHOULDER = 12
/** What a covered px of the place's houses costs, in px along the line. */
const HIDE = .3

/** Option b: a line along the feet of the place's own houses, with the height set into it under the spot (as on a contour). */
export function groundLine(scene: CaptionScene): Caption {
  const { spot, cover, onLand } = scene
  const line = feetLine(scene)
  const w = letterWidth(scene.height) + 2 * AIR
  const left = line[0][0] + SHOULDER + w / 2, right = line[line.length - 1][0] - SHOULDER - w / 2
  const list: Scored<ReturnType<typeof along>>[] = []
  const offer = (x: number) => {
    const at = along(line, x, w, 0)
    if (!fits({ ...at, w })) return
    const { fabric, ...rest } = cover({ ...at, w: w - 2 * AIR })
    list.push({ at, cover: { ...rest, fabric: 0 }, cost: Math.abs(x - spot.x) + fabric * HIDE })
  }
  for (let x = Math.min(left, spot.x); x <= Math.max(right, spot.x); x++) offer(x)
  const { x, y, h, slope } = least(list)?.at ?? along(line, spot.x, w, 0)
  return { option: 'b', name: null, height: scene.height, x, y, w, h, slope: Math.atan(slope),
    on: onLand(x, y + h / 2) ? 'land' : 'sky', spot, tick: null, line, markDx: null }
}

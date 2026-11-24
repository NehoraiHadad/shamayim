import { SCENE_W } from '../sceneBox'
import type { Pt } from '../typesAtmo'
import { CAPTION_FLOOR, fits, least, type Scored } from './cover'
import { AIR, INK_H, letterWidth, type CaptionScene } from './scene'
import type { Caption } from './types'

/** The line runs this far under the feet (px), and this far past the last house. */
const UNDER = 2, PAST = 5
/** Half the line of a place with no houses (px), and how far under the spot it lies. */
const BARE = 13, BARE_UNDER = 5
const TICK = 3
/** Px the line stays inside the figure. */
const EDGE = 5

export function feetLine({ extent, spot }: Pick<CaptionScene, 'extent' | 'spot'>): Pt[] {
  const feet: Pt[] = extent?.feet ?? [[spot.x - BARE, spot.y + BARE_UNDER], [spot.x, spot.y + BARE_UNDER], [spot.x + BARE, spot.y + BARE_UNDER]]
  const first = feet[0], last = feet[feet.length - 1]
  const line: Pt[] = [[first[0] - PAST, first[1]], ...feet.filter((_, i) => i % 3 === 0), last, [last[0] + PAST, last[1]]]
  return line.map(([x, y]): Pt => [Math.min(SCENE_W - EDGE, Math.max(EDGE, x)), Math.min(y + UNDER, CAPTION_FLOOR + 1)])
}

/** The line's y at a column (its ends' beyond them). */
export function lineAt(line: readonly Pt[], x: number) {
  const i = line.findIndex(([px]) => px >= x)
  if (i <= 0) return (i < 0 ? line[line.length - 1] : line[0])[1]
  const [ax, ay] = line[i - 1], [bx, by] = line[i]
  return ay + (by - ay) * (x - ax) / (bx - ax || 1)
}

/** Option b: a line along the feet of the place's own houses, ticked under its spot; the height hangs on the line. */
export function groundLine(scene: CaptionScene): Caption {
  const { spot, cover, onLand } = scene
  const line = feetLine(scene)
  const w = letterWidth(scene.height), h = INK_H, half = w / 2
  const [left] = line[0], [right] = line[line.length - 1]
  const low = (x0: number, x1: number) => Math.max(lineAt(line, x0), lineAt(line, x1),
    ...line.filter(([x]) => x >= x0 && x <= x1).map(([, y]) => y))
  const list: Scored<{ x: number; y: number }>[] = []
  const offer = (x: number, y: number, cost: number) => {
    if (fits({ x, y, w, h })) list.push({ at: { x, y }, cover: cover({ x, y, w, h }, 1), cost })
  }
  for (let dx = Math.ceil(left - spot.x); dx <= right - spot.x; dx++) {
    const x = spot.x + dx
    offer(x, low(x - half, x + half) + AIR + (Math.abs(dx) < half ? TICK - 1 : 0), Math.abs(dx))
  }
  offer(left - AIR - half, line[0][1] - h / 2, spot.x - left + w)
  offer(right + AIR + half, line[line.length - 1][1] - h / 2, right - spot.x + w)
  const { x, y } = least(list)?.at ?? { x: spot.x, y: CAPTION_FLOOR - h }
  const top = lineAt(line, spot.x)
  return { option: 'b', name: null, height: scene.height, x, y, w, h, slope: 0, on: onLand(x, y + h / 2) ? 'land' : 'sky', spot,
    tick: { top, bottom: top + TICK }, line, markDx: null }
}

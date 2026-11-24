import { DOT_DRAWN, LETTER_H, letterWidth, overlaps, type Box, type Point } from './layout'
import { markBox, type WorldMark } from './markGeometry'
import { outsideBodies } from './outsideBodies'
import { SCENE_W } from './sceneBox'
import { sceneClearance } from './sceneClearance'
import type { HeightMark, OutsideView, WorldLabels } from './types'

/** The figure's widths (px) the mark must stand clear at: text keeps its size while its place scales. */
export const MARK_WIDTHS = [320, SCENE_W, 430]
/** The most the letters rise over the roofs in the spot's column (px), and the air round them. */
const MAX_RISE = 40
export const AIR = 2
/** A place's own house or tower this near its spot (px): the town is seen there, and the spot needs no dot. */
const HOUSE_NEAR = 24
/** Half the columns over the spot whose roofs the letters stand over; the spot's column stays this far inside the letters (px). */
const COLUMN = 4, HOLD = 9
/** What is over a roof as drawn (px): a parapet or a ridge, a tower's crown. */
const ROOF = 2.5, CROWN = 4
/** Costs, in px of height over the roofs: a px aside, a covered px of the town, letters half on the sky, a note or a mark under them. */
const ASIDE = 1, FABRIC = 1, SPLIT = 8, BARRED = 1000
const EDGE = 2

type Bodies = Pick<OutsideView, 'skyline' | 'trees' | 'beyond' | 'beyondTowns' | 'frame' | 'baseKm'>

export interface HeightMarkInput {
  text: string
  dot: Point
  view: Bodies
  marks: readonly WorldMark[]
  labels: Pick<WorldLabels, 'notes' | 'datum'>
  /** The top of the land as drawn at a column (reference px). */
  landY(x: number): number
}

/** The place's own houses and towers round its spot, as they stand clear of the dot and the notes. */
function ownBodies({ view, dot, labels }: HeightMarkInput, dotted: boolean, reach: number): Box[] {
  const near = <T extends { x: number; w: number }>(list: readonly T[]) => list.filter((b) => Math.abs(b.x - dot.x) < reach + b.w / 2)
  const skyline = { ...view.skyline, boxes: near(view.skyline.boxes), towers: near(view.skyline.towers) }
  const { boxes, towers } = outsideBodies({ ...view, skyline, beyond: [], beyondTowns: [], trees: [] }, sceneClearance({ ...labels, height: { dotted } }, dot, SCENE_W), 1)
  return [...boxes.map(({ box, x, w }) => ({ left: x - w / 2, right: x + w / 2, top: box.top - ROOF, bottom: box.foot })),
    ...towers.map(({ tower, x, w }) => ({ left: x - w / 2, right: x + w / 2, top: tower.baseY - tower.h - CROWN, bottom: tower.baseY }))]
}

/** Whether the spot is marked with a dot: only where none of the place's own houses is drawn near it. */
function dottedAt({ view, dot }: HeightMarkInput): boolean {
  return ![...view.skyline.boxes, ...view.skyline.towers].some((b) => Math.abs(b.x - dot.x) < HOUSE_NEAR + b.w / 2)
}

/** What the letters may not cover at a figure's width (screen px): the notes, the marks, the datum's line. */
function barred({ labels, marks }: HeightMarkInput, width: number) {
  const sx = width / SCENE_W
  const notes = labels.notes.map((n) => ({ left: n.left * sx, right: n.left * sx + n.width, top: n.top, bottom: n.top + n.height }))
  const own = marks.map(markBox).map((b) => {
    const x = (b.left + b.right) / 2 * sx, half = (b.right - b.left) / 2
    return { ...b, left: x - half, right: x + half }
  })
  const line = (labels.datum?.segments ?? []).map((s) => ({ left: s.x1 * sx, right: s.x2 * sx, top: labels.datum!.y - 1, bottom: labels.datum!.y + 1 }))
  return { sx, boxes: [...notes, ...own, ...line] }
}

const area = (a: Box, b: Box) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

/**
 * Where the height is lettered: alone, close over what is drawn in its spot's own column (the roofs, or the dot where no
 * house is drawn), as low and as near the column as stands clear of the town, the notes and the marks at every width.
 * A fact of the place's own data: the same for every hour and style.
 */
export function heightMark(input: HeightMarkInput): HeightMark {
  const { dot, text, landY } = input
  const dotted = dottedAt(input)
  const w = letterWidth(text), reach = Math.floor(w / 2 - HOLD)
  const bodies = ownBodies(input, dotted, w + reach)
  const bars = MARK_WIDTHS.map((width) => barred(input, width))
  const column = { left: dot.x - COLUMN, right: dot.x + COLUMN, top: -Infinity, bottom: dot.y }
  const tops = [...bodies, ...input.marks.filter((m) => m.plane !== 'far').map(markBox)].filter((b) => overlaps(b, column)).map((b) => b.top)
  const stop = Math.min(dot.y - (dotted ? DOT_DRAWN : 0), ...tops) - AIR
  let best: { mark: HeightMark; cost: number } | null = null
  for (let rise = 0; rise <= MAX_RISE; rise++) {
    const y = stop - rise - LETTER_H
    if (y < EDGE || (best && rise >= best.cost)) break
    for (let dx = -reach; dx <= reach; dx++) {
      const x = dot.x + dx, box = { left: x - w / 2, right: x + w / 2, top: y, bottom: y + LETTER_H }
      const hidden = bars.filter(({ sx, boxes }) => {
        const at = { ...box, left: x * sx - w / 2, right: x * sx + w / 2 }
        return at.left < EDGE || at.right > SCENE_W * sx - EDGE || boxes.some((b) => overlaps(b, at, AIR))
      }).length * BARRED
      const land = [box.left, box.right].map((end) => box.bottom > landY(end))
      const cost = rise + Math.abs(dx) * ASIDE + hidden + (land[0] === land[1] ? 0 : SPLIT)
        + FABRIC * bodies.reduce((sum, b) => sum + area(b, box), 0)
      if (best && cost >= best.cost) continue
      best = { cost, mark: { x, y, on: y + LETTER_H / 2 > landY(x) ? 'land' : 'sky', dotted } }
    }
  }
  return best?.mark ?? { x: dot.x, y: EDGE, on: 'sky', dotted }
}

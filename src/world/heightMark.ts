import type { SceneNote } from '../data/terrain/sceneNotes'
import { DOT_R, LETTER_H, letterWidth, overlaps, type Box, type Point } from './layout'
import { markBox, type WorldMark } from './markGeometry'
import { outsideBodies } from './outsideBodies'
import { SCENE_W } from './sceneBox'
import { sceneClearance } from './sceneClearance'
import type { HeightMark, OutsideView, WorldLabels } from './types'

/** The figure's widths (px) the mark must stand clear at: text keeps its size while its place scales. */
export const MARK_WIDTHS = [320, SCENE_W, 430]
/** The letters' rise over the roofs (px): the least, the most; the tick's half width with its halo. */
export const TICK = { min: 6, max: 24, half: 1.5 }
/** Air (px): round the letters, between them and the tick, and between the tick and the dot, or the roofs under the letters. */
const AIR = 2, TIP = 1.5
/** Half the columns over the spot whose roofs the letters stand over; the spot's column stays this far inside the letters (px). */
const COLUMN = 4, HOLD = 9
/** What is over a roof as drawn (px): a parapet or a ridge, a tower's crown. */
const ROOF = 2.5, CROWN = 4
/** Costs, in px of height over the roofs: a px aside, a covered px of the town, letters half on the sky, letters down among the roofs. */
const ASIDE = .35, FABRIC = .1, SPLIT = 8, THROUGH = 25
/** A note or a mark under the letters or the tick; the datum's line under the tick. */
const BARRED = 1000, LINE = 60
const EDGE = 2
/** Air between the spot's column and the sea-level note (px). */
const ASTRIDE = 4

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

/** The sea-level note slid along its own line off the spot's column, where the line has room: the tick goes down there. */
export function noteOffSpot(notes: readonly SceneNote[], datum: WorldLabels['datum'], spotX: number): SceneNote[] {
  return notes.map((note) => {
    if (note.kind !== 'datum' || !datum) return note
    // Clear at every width: the text keeps its size while its left edge and the spot scale.
    const shrink = SCENE_W / Math.min(...MARK_WIDTHS)
    const before = spotX - (note.width + ASTRIDE) * shrink, after = spotX + ASTRIDE * shrink
    if (note.left <= before || note.left >= after) return note
    const free = [before, after].filter((left) => left >= datum.x1 && left + note.width <= datum.x2)
      .sort((a, b) => Math.abs(a - note.left) - Math.abs(b - note.left))
    return free.length ? { ...note, left: free[0] } : note
  })
}

/** The place's own houses and towers round its spot, as they stand clear of the dot and the notes. */
function ownBodies({ view, dot, labels }: HeightMarkInput, reach: number): Box[] {
  const near = <T extends { x: number; w: number }>(list: readonly T[]) => list.filter((b) => Math.abs(b.x - dot.x) < reach + b.w / 2)
  const skyline = { ...view.skyline, boxes: near(view.skyline.boxes), towers: near(view.skyline.towers) }
  const { boxes, towers } = outsideBodies({ ...view, skyline, beyond: [], beyondTowns: [], trees: [] }, sceneClearance(labels, dot, SCENE_W), 1)
  return [...boxes.map(({ box, x, w }) => ({ left: x - w / 2, right: x + w / 2, top: box.top - ROOF, bottom: box.foot })),
    ...towers.map(({ tower, x, w }) => ({ left: x - w / 2, right: x + w / 2, top: tower.baseY - tower.h - CROWN, bottom: tower.baseY }))]
}

/** What the mark may not cover at a figure's width (screen px): the notes, the marks, the datum's line. */
function barred({ labels, marks }: HeightMarkInput, width: number) {
  const sx = width / SCENE_W
  const notes = labels.notes.map((n) => ({ left: n.left * sx, right: n.left * sx + n.width, top: n.top, bottom: n.top + n.height }))
  const own = marks.map(markBox).map((b) => {
    const x = (b.left + b.right) / 2 * sx, half = (b.right - b.left) / 2
    return { ...b, left: x - half, right: x + half }
  })
  const line = (labels.datum?.segments ?? []).map((s) => ({ left: s.x1 * sx, right: s.x2 * sx, top: labels.datum!.y - 1, bottom: labels.datum!.y + 1 }))
  return { sx, boxes: [...notes, ...own], line }
}

const area = (a: Box, b: Box) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

/**
 * Where the height is lettered: over the roofs in its spot's own column, with a tick from under the letters down to
 * the dot itself (owner: the mark points at the place, its name is not there), as low and as near the column as stands clear of the
 * notes and the marks at every width. A fact of the place's own data: the same for every hour and style.
 */
export function heightMark(input: HeightMarkInput): HeightMark {
  const { dot, text, landY } = input
  const w = letterWidth(text), reach = Math.floor(w / 2 - HOLD)
  const bodies = ownBodies(input, w + reach)
  const bars = MARK_WIDTHS.map((width) => barred(input, width))
  const column = { left: dot.x - COLUMN, right: dot.x + COLUMN, top: -Infinity, bottom: dot.y }
  const tops = [...bodies, ...input.marks.filter((m) => m.plane !== 'far').map(markBox)].filter((b) => overlaps(b, column)).map((b) => b.top)
  const onDot = dot.y - DOT_R + TIP, bottom = onDot - TIP, roof = Math.min(onDot, ...tops)
  let best: { mark: HeightMark; cost: number } | null = null
  for (const [stop, base] of roof < onDot ? [[roof, 0], [onDot, THROUGH]] : [[roof, 0]]) {
    for (let rise = TICK.min; rise <= TICK.max; rise++) {
      const top = stop - TIP - rise, y = top - AIR - LETTER_H
      if (y < EDGE || (best && base + rise >= best.cost)) break
      const tick = bars.map(({ sx, boxes, line }) => {
        const box = { left: dot.x * sx - TICK.half, right: dot.x * sx + TICK.half, top, bottom }
        return (boxes.some((b) => overlaps(b, box)) ? BARRED : 0) + (line.some((b) => overlaps(b, box)) ? LINE : 0)
      }).reduce((a, b) => a + b)
      for (let dx = -reach; dx <= reach; dx++) {
        const x = dot.x + dx, box = { left: x - w / 2, right: x + w / 2, top: y, bottom: y + LETTER_H }
        const hidden = bars.filter(({ sx, boxes, line }) => {
          const at = { ...box, left: x * sx - w / 2, right: x * sx + w / 2 }
          return at.left < EDGE || at.right > SCENE_W * sx - EDGE || [...boxes, ...line].some((b) => overlaps(b, at, AIR))
        }).length * BARRED
        const land = [box.left, box.right].map((end) => box.bottom > landY(end))
        const cost = base + rise + Math.abs(dx) * ASIDE + tick + hidden + (land[0] === land[1] ? 0 : SPLIT)
          + FABRIC * bodies.reduce((sum, b) => sum + area(b, box), 0)
        if (best && cost >= best.cost) continue
        best = { cost, mark: { x, y, on: y + LETTER_H / 2 > landY(x) ? 'land' : 'sky', tick: { top, bottom } } }
      }
    }
  }
  return best?.mark ?? { x: dot.x, y: EDGE, on: 'sky', tick: { top: EDGE + LETTER_H + AIR, bottom } }
}

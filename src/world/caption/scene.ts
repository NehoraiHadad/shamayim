import { noteBoxes } from '../../data/terrain/sceneNotes'
import { heightLabelMarks } from '../heightLabelMarks'
import { portraitLabelObstacles } from '../heightLabelObstacles'
import { DOT_R, LABEL_PX, textWidth, type Point } from '../layout'
import { SCENE_W } from '../sceneBox'
import { groundAt } from '../sceneLight'
import type { Pt, WorldState } from '../types'
import { coverOf } from './cover'
import { lineAt } from './feetLine'
import { ownExtent, type OwnExtent } from './ownExtent'

/** The lettering's height (px): its figures and letters stand on its foot. */
export const INK_H = 9
/** Air between the lettering and what it stands by (px). */
export const AIR = 3

export interface CaptionScene {
  name: string; height: string; spot: Point
  extent: OwnExtent | null
  cover: ReturnType<typeof coverOf>
  /** Whether land stands behind a point. */
  onLand(x: number, y: number): boolean
}

/** Room for the lettering of either hand (px). */
export const letterWidth = (text: string) => Math.ceil(textWidth(text, LABEL_PX) * 1.1) + 2

/** Lettering leans with the ground no more than this. */
const LEAN = Math.tan(7 * Math.PI / 180)

/** Lettering `w` wide centred at a column, `drop` px under the line and leaning with it: its place and height, and its slope. */
export function along(line: readonly Pt[], x: number, w: number, drop: number) {
  const slope = Math.max(-LEAN, Math.min(LEAN, (lineAt(line, x + w / 2) - lineAt(line, x - w / 2)) / w))
  const h = INK_H + Math.abs(slope) * w
  return { x, y: lineAt(line, x) + drop - h / 2, h, slope }
}

export function captionScene(world: WorldState): CaptionScene | null {
  const view = world.place3
  if (view.kind !== 'outside') return null
  const { labels, terrain, camera, marks } = world
  const notes = noteBoxes(labels.notes)
  const { dot } = view
  const near = { nearPoints: terrain.near.points.map(([x, y]): [number, number] => [x, y]), sightAt: terrain.sightAt, horizonY: terrain.horizonY, camera }
  const cover = coverOf([
    ...portraitLabelObstacles(view),
    ...heightLabelMarks(marks, view, near, notes, SCENE_W),
    ...(labels.datum?.segments ?? []).map(s => ({ left: s.x1, right: s.x2, top: labels.datum!.y - 1, bottom: labels.datum!.y + 1,
      priority: 'note' as const })),
    ...notes.map(n => ({ ...n, priority: 'note' as const, fixed: 'left' as const })),
    { left: dot.x - DOT_R, right: dot.x + DOT_R, top: dot.y - DOT_R, bottom: dot.y + DOT_R, priority: 'note', fixed: 'center' },
  ])
  return { name: world.place.nameHe, height: labels.height.text, spot: dot, extent: ownExtent(view, dot.x), cover,
    onLand: (x, y) => y > Math.min(groundAt(terrain.near.points, x), groundAt(terrain.far.points, x)) }
}

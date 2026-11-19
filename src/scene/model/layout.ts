//# allFunctionsCalledOnLoad
import { DOT_R, textWidth } from '../../world/layout'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import type { Box, OverlayItem, SceneBox } from './types'

/** The height label's type (px) and line height, as `sceneLayout.ts` measures it. */
const LABEL_PX = 11

/**
 * The HTML overlay and the zones the drawing keeps clear (land px): the height label, the notes on the land (the
 * "פני הים" datum, the water's names) and the village dot, where the place's layout puts them (`world.labels`, laid out
 * by the world with its marks and portrait since C4, `world/place.ts`), x scaled from the reference width.
 */
export function layoutOf(world: WorldState, box: SceneBox): { overlay: OverlayItem[]; clear: Box[] } {
  const sx = box.width / SCENE_W
  const { height, notes } = world.labels
  const dot = world.place3.dot
  const overlay: OverlayItem[] = [
    { kind: 'dot', x: dot.x * sx, y: dot.y },
    { kind: 'height', text: height.text, x: height.x * sx, y: height.y, below: height.below },
    ...notes.map((note): OverlayItem => ({ kind: note.kind, text: note.text, x: note.left * sx, y: note.top })),
  ]
  const labelW = textWidth(height.text, LABEL_PX)
  const clear: Box[] = [
    { x: dot.x * sx - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R },
    { x: height.x * sx - labelW / 2, y: height.y, w: labelW, h: LABEL_PX },
    ...notes.map((note) => ({ x: note.left * sx, y: note.top, w: note.width, h: note.height })),
  ]
  return { overlay, clear }
}

//# allFunctionsCalledOnLoad
import { DOT_R, textWidth } from '../../world/layout'
import { BACKING_PAD } from '../../world/place'
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
    { kind: 'height', text: height.text, x: height.x * sx, y: height.y, below: height.below, ...(height.backed ? { backed: true } : {}) },
    ...notes.map((note): OverlayItem => ({ kind: note.kind, text: note.text, x: note.left * sx, y: note.top })),
  ]
  const pad = height.backed ? BACKING_PAD : 0
  const labelW = textWidth(height.text, LABEL_PX) + 2 * pad
  const clear: Box[] = [
    { x: dot.x * sx - DOT_R, y: dot.y - DOT_R, w: 2 * DOT_R, h: 2 * DOT_R },
    // A backed label (C9) lies over the place's mass on its backing: the drawing does not give way to it (no hole).
    ...(height.backed ? [] : [{ x: height.x * sx - labelW / 2, y: height.y - pad, w: labelW, h: LABEL_PX + 2 * pad }]),
    ...notes.map((note) => ({ x: note.left * sx, y: note.top, w: note.width, h: note.height })),
  ]
  return { overlay, clear }
}

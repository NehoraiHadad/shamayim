//# allFunctionsCalledOnLoad
import { SCENE_W } from '../../world/sceneBox'
import { sceneClearance, type ScreenBox } from '../../world/sceneClearance'
import type { WorldState } from '../../world/types'
import type { OverlayItem, SceneBox } from './types'

/**
 * The HTML overlay and the zones the drawing keeps clear (land px): the height label, the notes on the land (the
 * "פני הים" datum, the water's names) and the village dot, where the place's layout puts them (`world.labels`, laid out
 * by the world with its marks and portrait since C4, `world/place.ts`), x scaled from the reference width.
 */
export function layoutOf(world: WorldState, box: SceneBox): { overlay: OverlayItem[]; clear: ScreenBox[] } {
  const sx = box.width / SCENE_W
  const { height, notes } = world.labels
  const dot = world.place3.dot
  const overlay: OverlayItem[] = [
    { kind: 'dot', x: dot.x * sx, y: dot.y },
    { kind: 'height', text: height.text, x: height.x * sx, y: height.y, below: height.below,
      // Scale the anchors. The dot ring and badge themselves stay fixed in CSS px.
      leader: height.leader ? { ...height.leader, x1: height.leader.x1 + dot.x * (sx - 1),
        x2: height.leader.x2 + height.x * (sx - 1) } : null,
      ...(height.backed ? { backed: true } : {}) },
    ...notes.map((note): OverlayItem => ({ kind: note.kind, text: note.text, x: note.left * sx, y: note.top })),
  ]
  return { overlay, clear: sceneClearance(world.labels, dot, box.width) }
}

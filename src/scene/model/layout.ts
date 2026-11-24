//# allFunctionsCalledOnLoad
import { SCENE_W } from '../../world/sceneBox'
import { sceneClearance } from '../../world/sceneClearance'
import type { WorldState } from '../../world/types'
import { heightItem } from './heightItem'
import type { Box, OverlayItem, SceneBox } from './types'

/**
 * The HTML overlay (the place's height with its tick and dot, the notes on the land: the "פני הים" datum, the water's
 * names) and the zones the drawing keeps clear (land px: the dot, the notes), where the place's layout puts them (`world.labels`, laid out
 * by the world with its marks and portrait since C4, `world/place.ts`), x scaled from the reference width.
 */
export function layoutOf(world: WorldState, box: SceneBox): { overlay: OverlayItem[]; clear: Box[] } {
  const sx = box.width / SCENE_W
  const { labels, place3: { dot } } = world
  const overlay: OverlayItem[] = [
    heightItem(world, box.width),
    ...labels.notes.map((note): OverlayItem => ({ kind: note.kind, text: note.text, x: note.left * sx, y: note.top })),
  ]
  return { overlay, clear: sceneClearance(labels, dot, box.width) }
}

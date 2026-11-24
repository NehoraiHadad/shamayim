import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { landInk, waterInk } from './noteInk'
import { hexOf } from './tone'
import type { LayerDesc, OverlayItem, SceneBox } from './types'

/**
 * The HTML overlay: the notes on the land (the "פני הים" datum, the water's names) where the place's layout puts them
 * (`world.labels`, laid out by the world with its marks since C4, `world/place.ts`), x scaled from the reference width, each
 * in a tone of the ground or the water it stands on as drawn (`layers`).
 */
export function overlayOf(world: WorldState, box: SceneBox, layers: readonly LayerDesc[]): OverlayItem[] {
  const sx = box.width / SCENE_W
  const land = hexOf(landInk(world))
  return world.labels.notes.map(({ kind, text, left, top: y, width: w, height: h }) => {
    const x = left * sx
    return { kind, text, x, y, w, h, ink: kind === 'water' ? waterInk(layers, x + w / 2, y + h / 2) ?? land : land }
  })
}

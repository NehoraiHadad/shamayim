import type { WorldState } from '../../world/types'
import { layoutOf } from './layout'
import { planeLayers } from './planes'
import { skyLayer } from './sky'
import type { LayerDesc, SceneBox, SceneModel } from './types'

export type * from './types'

/**
 * The scene model (§1b): the world state and the box → the layers of both surfaces (sorted by surface, then `z`), the
 * HTML overlay and the clear zones. Pure: no canvas, no DOM, no clock; runs in vitest under node.
 *
 * C1: the sky gradient and the overlay placed from the world's layout; C2: the land's planes in the enriched hand.
 */
export function sceneModel(world: WorldState, box: SceneBox): SceneModel {
  const sky = skyLayer(world, box)
  const layout = layoutOf(world, box)
  const layers: LayerDesc[] = [...(sky ? [sky] : []), ...planeLayers(world, box, layout.clear)]
    .sort((a, b) => (a.surface === b.surface ? a.z - b.z : a.surface === 'sky' ? -1 : 1))
  return { layers, ...layout }
}

/** The layers drawn on one surface, in draw order. */
export const layersOn = (model: SceneModel, surface: LayerDesc['surface']) => model.layers.filter((layer) => layer.surface === surface)

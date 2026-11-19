//# allFunctionsCalledOnLoad
import type { WorldState } from '../../world/types'
import { farCitiesLayer } from './farCities'
import { layoutOf } from './layout'
import { marksLayers } from './marks'
import { outsideLayer } from './outside'
import { planeLayers } from './planes'
import { bodyLayers } from './bodies'
import { cloudLayersOf, flashLayersOf, shimmerLayerOf } from './clouds'
import { skyGeom, skyLayer } from './sky'
import { starsLayer } from './stars'
import type { LayerDesc, LayerOf, SceneBox, SceneModel } from './types'
import { waterLayers } from './water'
import { weatherLayers } from './weather'

export type * from './types'

/**
 * The scene model (§1b): the world state and the box → the layers of both surfaces (sorted by surface, then `z`), the
 * HTML overlay and the clear zones. Pure: no canvas, no DOM, no clock; runs in vitest under node.
 *
 * C1: the sky gradient and the overlay placed from the world's layout; C2: the land's planes in the enriched hand; C3: the
 * water, the far towns and the haze band at the horizon; C4: the marks and the village portrait; C5: the city seen from
 * outside (its mass, spires, towers, marks and coastal sea); C6: the sky's glows, the sun and the moon, the stars, the clouds
 * (drifting), the lightning and the heat shimmer; C7: the weather (rain and snow from their banks, mist, dust, rays, smoke,
 * the wet ground's sheen).
 */
export function sceneModel(world: WorldState, box: SceneBox): SceneModel {
  const layout = layoutOf(world, box)
  const towns = farCitiesLayer(world, box, layout.clear)
  const sky = skyLayers(world, box)
  const clouds = sky.filter((layer): layer is LayerOf<'clouds'> => layer.kind === 'clouds')
  const outside = outsideLayer(world, box, layout.clear)
  const layers: LayerDesc[] = [...sky, ...planeLayers(world, box, layout.clear), ...waterLayers(world, box, layout.clear),
    ...(towns ? [towns] : []), ...marksLayers(world, box), ...(outside ? [outside] : []), ...weatherLayers(world, box, clouds, layout.clear)]
    .sort((a, b) => (a.surface === b.surface ? a.z - b.z : a.surface === 'sky' ? -1 : 1))
  return { layers, ...layout }
}

/** The sky surface's layers (C6): the base, the stars, the bodies, the clouds by level, lightning, shimmer. */
export function skyLayers(world: WorldState, box: SceneBox): LayerDesc[] {
  const sky = skyLayer(world, box)
  if (!sky) return []
  const geom = skyGeom(world, box)
  const stars = starsLayer(world, box, geom)
  const clouds = cloudLayersOf(world, box, geom)
  const shimmer = shimmerLayerOf(world, box, geom)
  return [sky, ...(stars ? [stars] : []), ...bodyLayers(world, box, geom), ...clouds, ...flashLayersOf(world, box, clouds, geom),
    ...(shimmer ? [shimmer] : [])]
}

/** The layers drawn on one surface, in draw order. */
export const layersOn = (model: SceneModel, surface: LayerDesc['surface']) => model.layers.filter((layer) => layer.surface === surface)

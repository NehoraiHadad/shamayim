//# allFunctionsCalledOnLoad
import type { WorldState } from '../../world/types'
import { farCitiesLayer } from './farCities'
import { layoutOf } from './layout'
import { arrivingLayers, loadingLayers, showsUnknown } from './loading'
import { marksLayers } from './marks'
import { outsideLayer } from './outside'
import { planeLayers } from './planes'
import { bodyLayers } from './bodies'
import { cloudLayersOf, flashLayersOf, shimmerLayerOf } from './clouds'
import { skyGeom, skyLayer } from './sky'
import { starsLayer } from './stars'
import { birdLayers } from './birds'
import { contrailLayers, lowPlaneLayers, meteorLayers } from './life'
import { LIFE_START } from './lifeTracks'
import { milkyWayLayer, planetsLayer, twinkleOf } from './nightSky'
import { haloLayer, rainbowLayer } from './optics'
import type { LandClock, LayerDesc, LayerOf, LifeClock, SceneBox, SceneModel } from './types'
import { waterLayers } from './water'
import { weatherLayers } from './weather'

import { cloudShadowLayers } from './cloudShadows'
export type * from './types'

/**
 * The scene model (§1b): the world state and the box → the layers of both surfaces (sorted by surface, then `z`), the
 * HTML overlay and the clear zones. Pure: no canvas, no DOM, no clock; runs in vitest under node.
 *
 * C1: the sky gradient and the overlay placed from the world's layout; C2: the land's planes in the enriched hand; C3: the
 * water, the far towns and the haze band at the horizon; C4: the marks and the village portrait; C5: the city seen from
 * outside (its mass, spires, towers, marks and coastal sea); C6: the sky's glows, the sun and the moon, the stars, the clouds
 * (drifting), the lightning and the heat shimmer; C7: the weather (rain and snow from their banks, mist, dust, rays, smoke,
 * the wet ground's sheen); C8: while the land is not known, a mist in its place with a ridge line forming (`loading.ts`),
 * and the land's arrival timed by the shell's `clock` (no clock: the land shown as it is, the mist from phase 0).
 */
export function sceneModel(world: WorldState, box: SceneBox, clock: LandClock | null = null, life: LifeClock = LIFE_START): SceneModel {
  if (world.terrain.status !== 'ready') return unknownModel(world, box, clock ?? { loadingAt: 0 }, life)
  const model = knownModel(world, box, life)
  return clock?.reveal ? { ...model, layers: arrivingLayers(world, box, model.layers, clock) } : model
}

/**
 * The land not known yet (C8): the sky and the weather that needs no land as they are; in the land's place the mist and
 * the forming line; no labels (they stand on the land), no clear zones.
 */
function unknownModel(world: WorldState, box: SceneBox, clock: LandClock, life: LifeClock): SceneModel {
  const sky = skyLayers(world, box, life)
  const clouds = sky.filter((layer): layer is LayerOf<'clouds'> => layer.kind === 'clouds')
  const layers: LayerDesc[] = [...sky, ...weatherLayers(world, box, clouds, []).filter(showsUnknown), ...loadingLayers(world, box, clock)]
    .sort((a, b) => (a.surface === b.surface ? a.z - b.z : a.surface === 'sky' ? -1 : 1))
  return { layers, overlay: [], clear: [] }
}

function knownModel(world: WorldState, box: SceneBox, life: LifeClock): SceneModel {
  const layout = layoutOf(world, box)
  const towns = farCitiesLayer(world, box, layout.clear)
  const outside = outsideLayer(world, box, layout.clear)
  const marks = marksLayers(world, box)
  // The sky's life is hidden by the land drawn over it, and laid in front of the land it is nearer than.
  const sky = skyLayers(world, box, life)
  const clouds = sky.filter((layer): layer is LayerOf<'clouds'> => layer.kind === 'clouds')
  const layers: LayerDesc[] = [...sky, ...planeLayers(world, box, layout.clear), ...waterLayers(world, box, layout.clear),
    ...(towns ? [towns] : []), ...marks, ...(outside ? [outside] : []), ...cloudShadowLayers(world, box),
    ...weatherLayers(world, box, clouds, layout.clear)]
    .sort((a, b) => (a.surface === b.surface ? a.z - b.z : a.surface === 'sky' ? -1 : 1))
  return { layers, ...layout }
}

/** The sky surface's layers (C6): the base, the stars, the bodies, the clouds by level, lightning, shimmer. */
export function skyLayers(world: WorldState, box: SceneBox, life: LifeClock = LIFE_START): LayerDesc[] {
  const sky = skyLayer(world, box)
  if (!sky) return []
  const geom = skyGeom(world, box)
  const field = starsLayer(world, box, geom)
  const cloudLayers = cloudLayersOf(world, box, geom)
  const clouds = cloudLayers.filter((layer): layer is LayerOf<'clouds'> => layer.kind === 'clouds')
  const shimmer = shimmerLayerOf(world, box, geom)
  // C10: the brightest stars twinkle on their own strips; the planets stay steady; the Milky Way, the meteors, the birds,
  // the aircraft and their contrails, the rainbow and the halo, all from the world's life, night sky and optics.
  const twinkle = field ? twinkleOf(world, box, field.stars, geom) : { steady: [], layers: [] }
  const stars = field && twinkle.layers.length ? { ...field, stars: twinkle.steady } : field
  const planets = planetsLayer(world, box, geom)
  const milkyWay = milkyWayLayer(world, box, geom)
  const rainbow = rainbowLayer(world, box, geom)
  const halo = haloLayer(world, box, geom)
  return [sky, ...(milkyWay ? [milkyWay] : []), ...(stars ? [stars] : []), ...twinkle.layers, ...(planets ? [planets] : []),
    ...meteorLayers(world, box, geom, life), ...bodyLayers(world, box, geom), ...cloudLayers, ...flashLayersOf(world, box, clouds, geom),
    ...(shimmer ? [shimmer] : []), ...(halo ? [halo] : []), ...(rainbow ? [rainbow] : []), ...contrailLayers(world, box, geom, life),
    ...lowPlaneLayers(world, box, geom, life), ...birdLayers(world, box, geom, life)]
}

/** The layers drawn on one surface, in draw order. */
export const layersOn = (model: SceneModel, surface: LayerDesc['surface']) => model.layers.filter((layer) => layer.surface === surface)

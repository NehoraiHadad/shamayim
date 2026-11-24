import { farMasses } from './markOcclusion'
//# allFunctionsCalledOnLoad
import type { WorldState } from '../../world/types'
import { farCitiesLayer } from './farCities'
import { canopyOf } from './canopy'
import { plantWindOf } from './landWind'
import { landDustLayers } from './landDust'
import { layoutOf } from './layout'
import { arrivingLayers, loadingLayers, showsUnknown } from './loading'
import { marksLayers } from './marks'
import { outsideLayer, outsideMass, outsideHome } from './outside'
import { planeLayers } from './planes'
import { bodyLayers } from './bodies'
import { carriedCells, carriedSheet, minuteStart } from './advect'
import { cloudLayersOf } from './cloudLayers'
import { flashLayersOf } from './flash'
import { shimmerLayerOf } from './shimmer'
import { skyBoxKey } from './keys'
import { skyGeom, skyLayer } from './sky'
import { starsLayer } from './stars'
import { PLAIN_LIGHT, type StyleLight } from './styleLight'
import { birdLayers } from './birds'
import { contrailLayers, lowPlaneLayers, meteorLayers } from './life'
import { LIFE_START } from './lifeTracks'
import { milkyWayLayer, planetsLayer, twinkleOf } from './nightSky'
import { haloLayer, rainbowLayer } from './optics'
import type { Box, LandClock, LayerDesc, LayerOf, LifeClock, SceneBox, SceneModel } from './types'
import { waterLayers } from './water'
import { weatherLayers } from './weather'

import { cloudShadowsOf } from './cloudShadows'
import { shadowedPlane } from './planeCloudShadow'
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
 *
 * `light` is the painting hand's own light of the buildings, a value (`styleLight.ts`): the model knows no hand.
 */
export function sceneModel(world: WorldState, box: SceneBox, clock: LandClock | null = null, life: LifeClock = LIFE_START,
  light: StyleLight = PLAIN_LIGHT): SceneModel {
  if (world.terrain.status !== 'ready') return unknownModel(world, box, clock ?? { loadingAt: 0 }, life)
  const model = knownModel(world, box, life, light)
  return clock?.reveal ? { ...model, layers: arrivingLayers(world, box, model.layers, clock) } : model
}

/**
 * The land not known yet (C8): the sky and the weather that needs no land as they are; in the land's place the mist and
 * the forming line; no labels (they stand on the land), no clear zones.
 */
function unknownModel(world: WorldState, box: SceneBox, clock: LandClock, life: LifeClock): SceneModel {
  const sky = skyLayers(world, box, life)
  const layers: LayerDesc[] = [...sky, ...weatherLayers(world, box, []).filter(showsUnknown), ...loadingLayers(world, box, clock)]
    .sort((a, b) => (a.surface === b.surface ? a.z - b.z : a.surface === 'sky' ? -1 : 1))
  return { layers, overlay: [], clear: [] }
}

function knownModel(world: WorldState, box: SceneBox, life: LifeClock, light: StyleLight): SceneModel {
  const layout = layoutOf(world, box)
  const fabricZones = layout.clear.filter(zone => !zone.overFabric)
  const towns = farCitiesLayer(world, box, fabricZones, light)
  const outside = outsideOf(world, box, layout.clear, light)
  const home = outsideHome(world, box, layout.clear)
  const foreground = outsideMass(world, box, layout.clear).map(mass => ({ ...mass, alwaysInFront: true as const }))
  const marks = marksLayers(world, box, towns, home, layout.clear, [...foreground, ...farMasses(towns)], light)
  // The sky's life is hidden by the land drawn over it, and laid in front of the land it is nearer than.
  const sky = skyLayers(world, box, life)
  const shadows = cloudShadowsOf(world, box, sky.find(layer => layer.kind === 'cloudCells'))
  const planes = planeLayers(world, box, fabricZones)
    .map((plane) => shadowedPlane(plane, shadows.find((shadow) => shadow.plane === plane.plane), minuteStart(life), !life.still))
  const wind = plantWindOf(world.wind)
  const canopies = planes.flatMap((plane) => canopyOf(plane, wind, fabricZones, !life.still) ?? [])
  const layers: LayerDesc[] = [...sky, ...planes, ...canopies, ...waterLayers(world, box, layout.clear),
    ...(towns ? [towns] : []), ...marks, ...(outside ? [outside] : []),
    ...landDustLayers(world, box), ...weatherLayers(world, box, layout.clear)]
    .sort((a, b) => (a.surface === b.surface ? a.z - b.z : a.surface === 'sky' ? -1 : 1))
  return { layers, ...layout }
}

type OutsideMemo = { box: string; layer: ReturnType<typeof outsideLayer> }
const outsideMemo = new WeakMap<StyleLight, WeakMap<WorldState, OutsideMemo>>()

/**
 * The town in view (every building's tones by its distance): a minute's world is immutable and the clear zones follow
 * from it and the box, so a redraw of the same minute at the same size reuses it rather than relighting every building.
 */
function outsideOf(world: WorldState, box: SceneBox, clear: readonly Box[], light: StyleLight) {
  const key = `${box.width},${box.skyHeight},${box.landTop},${box.landHeight},${box.dpr}`
  let worlds = outsideMemo.get(light)
  if (!worlds) outsideMemo.set(light, worlds = new WeakMap())
  const previous = worlds.get(world)
  if (previous?.box === key) return previous.layer
  const layer = outsideLayer(world, box, clear, light)
  worlds.set(world, { box: key, layer })
  return layer
}

const cloudMemo = new WeakMap<WorldState, { box: number[]; layers: ReturnType<typeof cloudLayersOf> }>()

/** The sky surface's layers (C6): the base, the stars, the bodies, the clouds by level, lightning, shimmer. */
export function skyLayers(world: WorldState, box: SceneBox, life: LifeClock = LIFE_START): LayerDesc[] {
  const sky = skyLayer(world, box)
  if (!sky) return []
  const geom = skyGeom(world, box)
  const field = starsLayer(world, box, geom)
  const cloudBox = skyBoxKey(box, true)
  const previous = cloudMemo.get(world)
  // A minute's world is immutable. Reuse its cloud descriptors when the
  // land, animation or display asks to redraw at the same dimensions.
  const cloudLayers = previous && cloudBox.every((value, i) => value === previous.box[i])
    ? previous.layers : cloudLayersOf(world, box, geom)
  if (cloudLayers !== previous?.layers) cloudMemo.set(world, { box: cloudBox, layers: cloudLayers })
  const from = minuteStart(life)
  const carried = cloudLayers.map((layer) => (layer.kind === 'cloudSheet' ? carriedSheet(layer, from) : carriedCells(layer, from)))
  const shimmer = shimmerLayerOf(world, box, geom)
  // C10: the brightest stars twinkle on their own strips; the planets stay steady; the Milky Way, the meteors, the birds,
  // the aircraft and their contrails, the rainbow and the halo, all from the world's life, night sky and optics.
  const twinkle = field ? twinkleOf(world, box, field.stars, geom) : { steady: [], layers: [] }
  const stars = field && twinkle.layers.length ? { ...field, stars: twinkle.steady } : field
  const planets = planetsLayer(world, box, geom)
  const milkyWay = milkyWayLayer(world, box, geom)
  const rainbow = rainbowLayer(world, box, geom)
  const veil = cloudLayers.find((layer): layer is LayerOf<'cloudSheet'> => layer.kind === 'cloudSheet' && layer.genus === 'cs')
  const halo = veil ? haloLayer(world, box, geom, veil) : null
  return [sky, ...(milkyWay ? [milkyWay] : []), ...(stars ? [stars] : []), ...twinkle.layers, ...(planets ? [planets] : []),
    ...meteorLayers(world, box, geom, life), ...bodyLayers(world, box, geom), ...carried, ...flashLayersOf(world, box, geom),
    ...(shimmer ? [shimmer] : []), ...(halo ? [halo] : []), ...(rainbow ? [rainbow] : []), ...contrailLayers(world, box, geom, life),
    ...lowPlaneLayers(world, box, geom, life), ...birdLayers(world, box, geom, life)]
}

/** The layers drawn on one surface, in draw order. */
export const layersOn = (model: SceneModel, surface: LayerDesc['surface']) => model.layers.filter((layer) => layer.surface === surface)

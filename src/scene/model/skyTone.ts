//# allFunctionsCalledOnLoad
import type { RGB, WorldState } from '../../world/types'
import type { SkyGrade } from './styleLight'
import type { LayerDesc } from './types'

/*
 * The painting hand's grade of the sky's colours (`StyleLight.sky`). The world carries it through the model, so each
 * colour of the sky is graded where the model makes it (the stops, the glows, the arch, the haze) and what follows from
 * those is never graded again. The light that falls on things is worked out of the palette itself and stays ungraded.
 */
type GradedWorld = WorldState & { skyGrade?: SkyGrade }

const graded = new WeakMap<SkyGrade, WeakMap<WorldState, WorldState>>()

/** The world under a grade: one object for each world and grade, so what the model remembers of a world is the grade's own. */
export function gradedWorld(world: WorldState, grade?: SkyGrade): WorldState {
  if (!grade) return world
  let worlds = graded.get(grade)
  if (!worlds) graded.set(grade, worlds = new WeakMap())
  let own = worlds.get(world)
  if (!own) worlds.set(world, own = withGrade(world, grade))
  return own
}

const withGrade = (world: WorldState, skyGrade?: SkyGrade): GradedWorld => ({ ...world, skyGrade })

/** The world without its grade: for the sky as a light on things. */
export const ungradedWorld = (world: GradedWorld): WorldState => (world.skyGrade ? withGrade(world) : world)

/** A colour of the sky as the hand paints it. */
export function gradeSky(world: GradedWorld, rgb: RGB): RGB {
  const { skyGrade } = world
  return skyGrade ? skyGrade.colour(rgb, world.bodies.sun.altitude) : rgb
}

/** The grade in every bitmap's key: the light part's of a layer that has one (its form holds no light), else the layer's. */
export function withGradeKey(layers: LayerDesc[], grade?: SkyGrade): LayerDesc[] {
  if (!grade) return layers
  const bits = `:grade:${grade.key}`
  return layers.map((layer) => (layer.light ? { ...layer, light: { ...layer.light, key: layer.light.key + bits } }
    : { ...layer, key: layer.key + bits }) as LayerDesc)
}

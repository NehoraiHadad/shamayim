import type { WorldState } from '../../world/types'
import { cityOnSky } from './cityLight'
import { dustSky, dustVeilWeight } from './cloudDust'
import { rgbOf } from './tone'
import type { RGB } from './types'

type Stops = { top: RGB; mid: RGB; horizon: RGB }
function computeColours(world: WorldState) {
  const { palette } = world.light
  const veiled = dustSky(world)
  const [t, m, h] = veiled ?? [rgbOf(palette.top), rgbOf(palette.mid), rgbOf(palette.horizon)]
  const physical: Stops = { top: cityOnSky(world, t, 90), mid: cityOnSky(world, m, 30), horizon: cityOnSky(world, h, 0) }
  return { ...physical, bandWeight: veiled ? dustVeilWeight(world, 0) : 0 }
}

const cache = new WeakMap<WorldState, ReturnType<typeof computeColours>>()

export function skyColours(world: WorldState) {
  const hit = cache.get(world)
  if (hit) return hit
  const colours = computeColours(world)
  cache.set(world, colours)
  return colours
}

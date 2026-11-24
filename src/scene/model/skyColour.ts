import { smoothstep } from '../../domain/smoothstep'
import type { WorldState } from '../../world/types'
import { cityOnSky } from './cityLight'
import { dustSky, dustVeilWeight } from './cloudDust'
import { SKY_FILTER_MID } from './skyFilter'
import { mixRgb, rgbOf } from './tone'
import type { RGB, SceneBox } from './types'

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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** The covers of the three layers (low, mid, high). */
export const coversOf = (world: WorldState) => ({ low: world.clouds[0]?.cover ?? 0, mid: world.clouds[1]?.cover ?? 0,
  high: world.clouds[2]?.cover ?? 0 })

/** How much the cloud in front veils a body (0 clear … 1 hidden): the share of its direct light the cloud takes. */
export const veilOf = (world: WorldState) => 1 - world.light.clear

/**
 * The sky's gradient stops (fractions of the sky surface's height): the zenith at the top, the mid tone a little over
 * half way down to the horizon, the horizon colour at eye level (the land's own horizon, offset by `box.landTop`) and
 * below it.
 */
export function skyStops(world: WorldState, box: SceneBox, colours = skyColours(world)): [number, RGB][] {
  const eyeLevel = (box.landTop + world.relief.horizonY) / box.skyHeight
  const horizon = colours.bandWeight ? Math.max(0, eyeLevel) : clamp01(eyeLevel)
  // By night inside a town its lit air is over every side, less and less up to the zenith (the mid stop stands ~30° up).
  const { top, mid, horizon: ground } = colours
  const middle = horizon * SKY_FILTER_MID
  if (!colours.bandWeight) return [[0, top], [middle, mid], [horizon, ground], [1, ground]]
  // Eighths across the shoulders with half steps at the ends to resolve the
  // flatter tangent where adjacent segments meet.
  const rows = [0, 1 / 16, 1 / 8, 1 / 4, 3 / 8, 1 / 2, 5 / 8, 3 / 4, 7 / 8, 15 / 16]
  const ease = smoothstep(0, 1, colours.bandWeight)
  const segment = (a: number, b: number, from: RGB, to: RGB): [number, RGB][] =>
    rows.map(t => [a + (b - a) * t, mixRgb(from, to, t + ease * (smoothstep(0, 1, t) - t))])
  const stops: [number, RGB][] = [...segment(0, middle, top, mid), ...segment(middle, horizon, mid, ground), [horizon, ground]]
  return [...stops.filter(([at]) => at < 1), [1, stopAt(stops, 1)]]
}

/** The gradient's colour at a fraction of the sky's height. */
export function stopAt(stops: readonly [number, RGB][], at: number, blend = mixRgb): RGB {
  for (let i = 1; i < stops.length; i++) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i]
    if (at <= b) return b > a ? blend(ca, cb, clamp01((at - a) / (b - a))) : cb
  }
  return stops.at(-1)![1]
}

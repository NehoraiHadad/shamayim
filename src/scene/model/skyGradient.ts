import { smoothstep } from '../../domain/smoothstep'
import type { WorldState } from '../../world/types'
import { physicalHazeOf } from './landVeil'
import { exposeDust, skyColours } from './skyColour'
import { labOf, mixLight, mixRgb, rgbOfLab } from './tone'
import type { Band, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]

/**
 * The sky's gradient stops (fractions of the sky surface's height): the zenith at the top, the mid tone a little over
 * half way down to the horizon, the horizon colour at eye level (the land's own horizon, offset by `box.landTop`) and
 * below it.
 */
export function skyStops(world: WorldState, box: SceneBox, colours = skyColours(world), physical = false): [number, RGB][] {
  const horizon = clamp01((box.landTop + world.relief.horizonY) / box.skyHeight)
  // By night inside a town its lit air is over every side, less and less up to the zenith (the mid stop stands ~30° up).
  const { top, mid, horizon: ground } = physical ? colours.physical : colours
  const middle = horizon * 0.55
  if (physical || colours.exposure === 1) return [[0, top], [middle, mid], [horizon, ground], [1, ground]]
  // Piecewise-linear sampling of a cubic shoulder. Sixteen intervals keep the
  // interpolation error below one byte even for a full-range smoothstep.
  const count = 16
  const ease = smoothstep(0, 1 / 255, 1 - colours.exposure)
  const segment = (a: number, b: number, from: RGB, to: RGB): [number, RGB][] => {
    const start = labOf(from), end = labOf(to)
    return Array.from({ length: count }, (_, i) => {
      if (!i) return [a, from]
      const t = i / count
      const w = t + ease * (smoothstep(0, 1, t) - t)
      return [a + (b - a) * t, rgbOfLab({ l: start.l + (end.l - start.l) * w,
        a: start.a + (end.a - start.a) * w, b: start.b + (end.b - start.b) * w })]
    })
  }
  return [...segment(0, middle, top, mid), ...segment(middle, horizon, mid, ground), [horizon, ground], [1, ground]]
}

/** The gradient's colour at a fraction of the sky's height. */
export function stopAt(stops: readonly [number, RGB][], at: number): RGB {
  for (let i = 1; i < stops.length; i++) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i]
    if (at <= b) return b > a ? mixRgb(ca, cb, clamp01((at - a) / (b - a))) : cb
  }
  return stops.at(-1)![1]
}

/**
 * The sky's colour at an altitude (deg above eye level) as the gradient draws it: what still water mirrors at the same
 * angle below the horizon.
 */
export function skyAt(world: WorldState, box: SceneBox): (altitude: number) => RGB {
  const stops = skyStops(world, box)
  return (altitude) => stopAt(stops, clamp01((box.landTop + world.relief.y(Math.max(0, altitude))) / Math.max(1, box.skyHeight)))
}

/** Height (px) of the haze band over the horizon. */
const BAND_H = 44

/**
 * The haze band at the horizon (`air.horizonBand`): the air seen through its whole depth, lighter and paler just over
 * the far land, stronger as the visibility falls; by night it keeps only the sky's own horizon tone, faint.
 */
export function horizonBand(world: WorldState, box: SceneBox, colours = skyColours(world)): Band | null {
  const { horizonBand: given } = world.air
  const dark = world.night.dark
  const alpha = given.alpha * (1 - 0.6 * dark)
  if (alpha < 0.02) return null
  const white = 0.12 * (1 - dark)
  const base = mixRgb(physicalHazeOf(world), WHITE, white)
  const rgb = colours.bandWeight ? exposeDust(mixRgb(base, mixLight(colours.physical.horizon, WHITE, white),
    colours.bandWeight), colours.exposure) : base
  return { y: box.landTop + world.relief.horizonY, h: BAND_H, rgb, alpha }
}

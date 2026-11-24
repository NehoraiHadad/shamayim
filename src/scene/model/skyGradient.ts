import { smoothstep } from '../../domain/smoothstep'
import type { WorldState } from '../../world/types'
import { physicalHazeOf } from './landVeil'
import { skyColours } from './skyColour'
import { mixLight, mixRgb } from './tone'
import { filterAt, skyGradeOf } from './skyGrade'
import { SKY_FILTER_MID } from './skyFilter'
import type { Band, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]

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
export function stopAt(stops: readonly [number, RGB][], at: number): RGB {
  for (let i = 1; i < stops.length; i++) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i]
    if (at <= b) return b > a ? mixRgb(ca, cb, clamp01((at - a) / (b - a))) : cb
  }
  return stops.at(-1)![1]
}

/**
 * The sky's colour at an altitude (deg above eye level) as the gradient draws it: what still water mirrors at the same
 * angle below the horizon. Pass physical for light or for an object painted behind the grade.
 */
export function skyAt(world: WorldState, box: SceneBox, physical = false): (altitude: number) => RGB {
  const stops = skyStops(world, box)
  const grade = physical ? null : skyGradeOf(world, box)
  return (altitude) => {
    const y = box.landTop + world.relief.y(Math.max(0, altitude))
    const rgb = stopAt(stops, clamp01(y / Math.max(1, box.skyHeight)))
    return filterAt(grade, y, rgb)
  }
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
  const rgb = colours.bandWeight ? mixRgb(base, mixLight(colours.horizon, WHITE, white), colours.bandWeight) : base
  return { y: box.landTop + world.relief.horizonY, h: BAND_H, rgb, alpha }
}

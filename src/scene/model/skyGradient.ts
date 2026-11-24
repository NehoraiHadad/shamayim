import type { WorldState } from '../../world/types'
import { hazeOf } from './landVeil'
import { skyColours, skyStops, stopAt } from './skyColour'
import { mixLight, mixRgb, mixSrgb } from './tone'
import { filterAt, skyGradeOf } from './skyGrade'
import type { Band, RGB, SceneBox } from './types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const WHITE: RGB = [1, 1, 1]

export { skyStops, stopAt } from './skyColour'

/**
 * The sky's colour at an altitude (deg above eye level) as the gradient draws it: what still water mirrors at the same
 * angle below the horizon. Pass physical for light or for an object painted behind the grade.
 */
export function skyAt(world: WorldState, box: SceneBox, physical = false): (altitude: number) => RGB {
  const stops = skyStops(world, box)
  const grade = physical ? null : skyGradeOf(world, box)
  return (altitude) => {
    const y = box.landTop + world.relief.y(Math.max(0, altitude))
    const rgb = stopAt(stops, clamp01(y / Math.max(1, box.skyHeight)), grade ? mixSrgb : mixRgb)
    return filterAt(grade, y, rgb)
  }
}

/** Height (px) of the haze band over the horizon. */
const BAND_H = 44

/**
 * The haze band at the horizon (`air.horizonBand`): the air seen through its whole depth, lighter and paler just over
 * the far land, stronger as the visibility falls; by night it keeps only the sky's own horizon tone, faint. `below`: px of
 * sky seen under eye level.
 */
export function horizonBand(world: WorldState, box: SceneBox, colours = skyColours(world), below = 0): Band | null {
  const { horizonBand: given } = world.air
  const dark = world.night.dark
  const alpha = given.alpha * (1 - 0.6 * dark)
  if (alpha < 0.02) return null
  const white = 0.12 * (1 - dark)
  const base = mixRgb(hazeOf(world), WHITE, white)
  const rgb = colours.bandWeight ? mixRgb(base, mixLight(colours.horizon, WHITE, white), colours.bandWeight) : base
  return { y: box.landTop + world.relief.horizonY, h: BAND_H, rgb, alpha, ...(below > 0 && { below }) }
}

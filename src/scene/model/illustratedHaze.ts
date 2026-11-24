import type { WorldState, RGB } from '../../world/types'
import { illustratedHazeAt as hazeAt } from './landVeil'
import { gradeSky } from './skyTone'
import { labOf, mixRgb, rgbOf, rgbOfLab } from './tone'

/** The air of the illustrated palette: the low sky toward the air's own colour by day. */
export function illustratedAirOf(world: WorldState): RGB {
  const { palette } = world.light
  const sky = mixRgb(rgbOf(palette.mid), rgbOf(palette.horizon), 0.45)
  return mixRgb(sky, world.air.haze, 0.3 * (1 - world.night.dark))
}

/** That air as it is seen, as the hand paints the sky. */
export const illustratedHazeOf = (world: WorldState): RGB => gradeSky(world, illustratedAirOf(world))

/** That palette's aerial perspective: a tone taken toward its air by distance, in Oklab. */
export function illustratedAerialFor(world: WorldState, haze = illustratedHazeOf(world)): (rgb: RGB, km: number) => RGB {
  const air = labOf(haze)
  return (rgb, km) => {
    const t = hazeAt(world, km)
    const own = labOf(rgb)
    return rgbOfLab({ l: own.l + (air.l - own.l) * t, a: own.a + (air.a - own.a) * t, b: own.b + (air.b - own.b) * t })
  }
}

import type { WorldState, RGB } from '../../world/types'
import { illustratedHazeAt as hazeAt } from './landVeil'
import { labOf, mixRgb, rgbOf, rgbOfLab } from './tone'

export function drawnHazeOf(world: WorldState): RGB {
  const { palette } = world.light
  const sky = mixRgb(rgbOf(palette.mid), rgbOf(palette.horizon), 0.45)
  return mixRgb(sky, world.air.haze, 0.3 * (1 - world.night.dark))
}

export function drawnAerialFor(world: WorldState, haze = drawnHazeOf(world)): (rgb: RGB, km: number) => RGB {
  const air = labOf(haze)
  return (rgb, km) => {
    const t = hazeAt(world, km)
    const own = labOf(rgb)
    return rgbOfLab({ l: own.l + (air.l - own.l) * t, a: own.a + (air.a - own.a) * t, b: own.b + (air.b - own.b) * t })
  }
}

import { DUST_VEIL } from '../../theme/skyAir'
import { aerosolDepth, airMass, hazeAbove } from '../../world/sceneLight'
import type { Air, WorldState } from '../../world/types'
import { atLuminance, luminanceOf, tinted } from './cloudChromaticity'
import { daylitShare } from './cloudSunlit'
import { srgbRgbToLinear } from './landRadiance'
import { mixLight, mixRgb, rgbOf } from './tone'
import type { RGB } from './types'

/* The sky and the clouds in a dusty air: one sunlit veil, its optical depth and its colour, for both. */

/** The dust's vertical optical depth (550 nm): as much of the air's aerosol as the dust lights the sky with. */
const dustDepth = (air: Air) => air.dustAirlight ? air.dustAirlight * aerosolDepth(air)[1] : 0

/** The light a full path of dust gives back: the horizon's brightness in the dust's pale buff (under a low sun, the horizon's own). */
function dustLight(world: WorldState): RGB {
  const horizon = rgbOf(world.light.palette.horizon)
  return mixRgb(horizon, atLuminance(srgbRgbToLinear(rgbOf(DUST_VEIL)), luminanceOf(horizon)), daylitShare(world.bodies.sun.altitude))
}

/** The sky's zenith, middle (30°) and horizon seen through the dust: Beer's law along each line of sight. */
export function dustSky(world: WorldState, sky: readonly [RGB, RGB, RGB]): readonly [RGB, RGB, RGB] {
  const depth = dustDepth(world.air)
  if (!depth) return sky
  const light = dustLight(world)
  const seen = (rgb: RGB, altitude: number) => mixLight(rgb, light, -Math.expm1(-depth * airMass(altitude)))
  return [seen(sky[0], 90), seen(sky[1], 30), seen(sky[2], 0)]
}

/** A cloud's tone in the light that reaches it: what the dust has scattered has the dust's colour. */
export function inDust(world: WorldState, rgb: RGB): RGB {
  const depth = dustDepth(world.air)
  return depth ? tinted(rgb, dustLight(world), -Math.expm1(-depth)) : rgb
}

/** The share of a sheet's light that the dust under its base (km) lets through, per row (deg of altitude); none in clean air. */
export function sheetThrough(air: Air | undefined, baseKm: number, altitudes: readonly number[]): number[] | undefined {
  const depth = air ? dustDepth(air) * (1 - hazeAbove(baseKm)) : 0
  return depth ? altitudes.map((altitude) => Math.exp(-depth * airMass(Math.max(0, altitude)))) : undefined
}

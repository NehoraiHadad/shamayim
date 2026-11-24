import { daylitShare } from '../../domain/cloudDaylight'
import { DUST_VEIL } from '../../theme/skyAir'
import { aerosolDepth, airMass, hazeAbove } from '../../world/sceneLight'
import type { Air, WorldState } from '../../world/types'
import { atLuminance, luminanceOf, tinted } from './cloudChromaticity'
import { layerKeyNumber } from './keys'
import { srgbRgbToLinear } from './landRadiance'
import { mixLight, mixRgb, rgbOf } from './tone'
import type { RGB } from './types'

/* The sky and the clouds in a dusty air: one sunlit veil, its optical depth and its colour, for both. */

/** The dust's vertical optical depth (550 nm): as much of the air's aerosol as the dust lights the sky with. */
const dustDepth = (air?: Air) => air?.dustVeilPotential ? air.dustVeilPotential * aerosolDepth(air)[1] : 0

/** The light a full path of dust gives back: the horizon's brightness in the dust's pale buff (under a low sun, the horizon's own). */
function dustLight(world: WorldState, daylit: number): RGB {
  const horizon = rgbOf(world.light.palette.horizon)
  return mixRgb(horizon, atLuminance(srgbRgbToLinear(rgbOf(DUST_VEIL)), luminanceOf(horizon)), daylit)
}

/** The sky's zenith, middle (30°) and horizon seen through the dust: Beer's law along each line of sight. */
export function dustSky(world: WorldState, sky: readonly [RGB, RGB, RGB]): readonly [RGB, RGB, RGB] {
  const depth = dustDepth(world.air)
  const daylit = daylitShare(world.bodies.sun.altitude)
  if (!depth || !daylit) return sky
  const light = dustLight(world, daylit)
  // Daylight scales the scattered light. Scaling the depth would saturate the horizon at the start of the ramp.
  const seen = (rgb: RGB, altitude: number) => mixLight(rgb, light, -daylit * Math.expm1(-depth * airMass(altitude)))
  return [seen(sky[0], 90), seen(sky[1], 30), seen(sky[2], 0)]
}

/** A cloud's tone in the light that reaches it: what the dust has scattered has the dust's colour. */
export function inDust(world: WorldState, rgb: RGB): RGB {
  const depth = dustDepth(world.air)
  const daylit = daylitShare(world.bodies.sun.altitude)
  return depth && daylit ? tinted(rgb, dustLight(world, daylit), -daylit * Math.expm1(-depth)) : rgb
}

/** The share of a sheet's light that the dust under its base (km) lets through, per row (deg of altitude); none in clean air. */
export function sheetThrough(air: Air | undefined, baseKm: number, altitudes: readonly number[], daylit: number): number[] | undefined {
  const depth = dustDepth(air) * (1 - hazeAbove(baseKm))
  if (!depth || !daylit) return
  // Match layerKey's hundredths before the values reach either painter.
  const through = altitudes.map((altitude) => layerKeyNumber(1 + daylit * Math.expm1(-depth * airMass(Math.max(0, altitude)))))
  return through.some((value) => value < 1) ? through : undefined
}

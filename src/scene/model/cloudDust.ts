import { daylitShare } from '../../domain/cloudDaylight'
import { smoothstep } from '../../domain/smoothstep'
import { DUST_VEIL } from '../../theme/skyAir'
import { R_EFF_KM } from '../../world/field/project'
import { aerosolDepth550, HAZE_KM, hazeAbove } from '../../world/sceneLight'
import type { Air, WorldState } from '../../world/types'
import { atLuminance, luminanceOf, tinted } from './cloudChromaticity'
import { layerKeyNumber } from './keys'
import { srgbRgbToLinear } from './landRadiance'
import { mixLight, mixRgb, rgbOf } from './tone'
import type { RGB } from './types'

/* The sky and the clouds in a dusty air: one sunlit veil, its optical depth and its colour, for both. */

/** The dust's vertical optical depth (550 nm): as much of the air's aerosol as the dust lights the sky with. */
const dustDepth = (air?: Air) => air?.dustVeilPotential ? air.dustVeilPotential * aerosolDepth550(air.visibilityKm) : 0
/** Ease from the palette's 3° twilight anchor to its 12° daylight anchor. */
const dustDaylight = (altitude: number) => smoothstep(3, 12, altitude)

/** Keep the legacy tonal fade for the residual visibility extinction, treating it as aerosol-dominated. */
export function cloudHazeFade(world: WorldState, km: number): number {
  const dust = (world.air.dustVeilPotential ?? 0) * dustDaylight(world.bodies.sun.altitude)
  return world.air.fade(km * (1 - dust))
}

// The Gaussian integral along the tangent of an exponential layer gives sqrt(πR/2H).
// Match that limit and the plane-parallel secant in a quadratic approximation to the slant column.
const CURVATURE = 8 * HAZE_KM / (Math.PI * R_EFF_KM)
function dustAirMass(altitude: number) {
  const up = Math.sin(Math.max(0, altitude) * Math.PI / 180)
  return 2 / (up + Math.sqrt(up * up + CURVATURE * (1 - up * up)))
}

/** The light a full path of dust gives back: the horizon's brightness in the dust's pale buff (under a low sun, the horizon's own). */
function dustLight(world: WorldState, daylit: number): RGB {
  const horizon = rgbOf(world.light.palette.horizon)
  return mixRgb(horizon, atLuminance(srgbRgbToLinear(rgbOf(DUST_VEIL)), luminanceOf(horizon)), daylit)
}

/** The sky's zenith, middle (30°) and horizon seen through the dust: Beer's law along each line of sight. */
export function dustSky(world: WorldState): readonly [RGB, RGB, RGB] | undefined {
  const depth = dustDepth(world.air)
  const daylit = dustDaylight(world.bodies.sun.altitude)
  if (!depth || !daylit) return
  const { top, mid, horizon } = world.light.palette
  const light = dustLight(world, daylit)
  // Daylight scales the scattered light. Scaling the depth would saturate the horizon at the start of the ramp.
  const seen = (hex: string, altitude: number) =>
    mixLight(rgbOf(hex), light, -daylit * Math.expm1(-depth * dustAirMass(altitude)))
  return [seen(top, 90), seen(mid, 30), seen(horizon, 0)]
}

/** A cloud's tone in the light that reaches it: what the dust has scattered has the dust's colour. */
export function inDust(world: WorldState, rgb: RGB, baseKm: number): RGB {
  const depth = dustDepth(world.air)
  if (!depth) return rgb
  const daylit = daylitShare(world.bodies.sun.altitude)
  const above = depth * hazeAbove(Math.max(0, baseKm))
  return daylit ? tinted(rgb, dustLight(world, daylit), -daylit * Math.expm1(-above)) : rgb
}

const clearTransmission = () => 1

/** Beer transmission below a cloud's base. The daylight weight eases the display effect into the existing twilight palette.
 * Extinction itself does not depend on sunlight. */
export function cloudTransmission(air: Air | undefined, baseKm: number, sunAltitude: number) {
  if (!air?.dustVeilPotential || sunAltitude <= 3 || baseKm <= 0) return clearTransmission
  const depth = dustDepth(air) * (1 - hazeAbove(baseKm))
  const daylit = dustDaylight(sunAltitude)
  return (altitude: number) => 1 + daylit * Math.expm1(-depth * dustAirMass(altitude))
}

/** Transmission per raster row in the same precision as the layer key. */
export function sheetThrough(air: Air | undefined, baseKm: number, altitudes: readonly number[], sunAltitude: number): number[] | undefined {
  const throughAt = cloudTransmission(air, baseKm, sunAltitude)
  if (throughAt === clearTransmission) return
  // Match layerKey's hundredths before the values reach either painter.
  const through = altitudes.map((altitude) => layerKeyNumber(throughAt(altitude)))
  return through.some((value) => value < 1) ? through : undefined
}

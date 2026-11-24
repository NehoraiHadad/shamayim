import type { Normal } from '../../world/livingLight'
import type { RGB, WorldState } from '../../world/types'
import { nearGroundAlbedo } from './landColour'
import { landIrradiance, type LandIrradiance } from './landIrradiance'
import { albedoLinear, EXPOSURE_GAMMA, linearLuminance, srgbRgbToLinear } from './landRadiance'
import { afterglowHorizon, afterglowWeight, twilightShare } from './landSkyIrradiance'
import { hazeOf } from './landVeil'
import { outsideGroundAlbedo } from './outsideGround'
import { solarSkyGlows, sunwardHorizon } from './skyGlows'
import { rgbOf } from './tone'

export function reflectedGround(rho: RGB, irr: LandIrradiance, visible: number, sunlit: number): RGB {
  const sun = sunlit * Math.max(0, irr.sunDir.up), moon = Math.max(0, irr.moonDir.up)
  const channel = (i: 0 | 1 | 2) => visible * rho[i] * (irr.eSkyVec[i] + sun * irr.eSunVec[i] + moon * irr.eMoonVec[i])
  return [channel(0), channel(1), channel(2)]
}

export function groundView(n: Normal) { return (1 - n[2]) * .5 }

/** Mean clear gap is about twice a building's height. Its illuminated share is
 * gap / (gap + shadow length), averaged over street orientations. The land
 * irradiance already accounts for the cloud deck and wet-ground reflectance. */
export function sunlitGround({ up }: LandIrradiance['sunDir']) {
  const rise = 2 * Math.max(0, up)
  return rise / (rise + Math.hypot(Math.sqrt(Math.max(0, 1 - up * up)), .001))
}

export interface Surroundings { irr: LandIrradiance; ground: RGB; air: RGB }
export interface BuildingSurroundings extends Surroundings { streetY: number }
const memo = new WeakMap<WorldState, { buildings: BuildingSurroundings; accents: Surroundings }>()
const metalLobes = new WeakMap<WorldState, RGB>()

/** Sample the palette and solar glows on the Sun's meridian in the reference
 * projection. The painted haze band and city light on the sky are omitted. */
export function metalHorizon(world: WorldState) {
  const cached = metalLobes.get(world)
  if (cached) return cached
  const horizon = rgbOf(world.light.palette.horizon)
  const lobe = twilightShare(world.bodies.sun.altitude) > 0
    ? sunwardHorizon(horizon, solarSkyGlows(world, 0, 0, 1), world.bodies.sun.x, world.relief.horizonY)
    : srgbRgbToLinear(horizon)
  metalLobes.set(world, lobe)
  return lobe
}

export function groundLighting(world: WorldState) {
  const cached = memo.get(world)
  if (cached) return cached
  const irr = landIrradiance(world), air = srgbRgbToLinear(hazeOf(world))
  const nearby = nearGroundAlbedo(world), view = world.place3
  const albedo = view?.kind === 'outside' && view.land ? outsideGroundAlbedo(world, view.land, view.frame) : nearby
  // Soften the afterglow's contribution to diffuse energy and directional bias
  // at the edges of its altitude window before shading the walls.
  const glow = world.light.afterglow, weight = glow ? afterglowWeight(irr.sunAlt) : 1
  const lightWorld = glow && weight < 1 ? { ...world, light: { ...world.light, afterglow: {
    ...glow, rgb: afterglowHorizon(world.light, irr.sunAlt),
  } } } : world
  const buildingIrr = lightWorld === world ? irr : landIrradiance(lightWorld)
  const visibleGround = .92
  const ground = reflectedGround(albedoLinear(albedo), buildingIrr, visibleGround, sunlitGround(buildingIrr.sunDir))
  const result = {
    buildings: { irr: buildingIrr, air,
      ground, streetY: buildingIrr.yHorizon * (linearLuminance(ground) / visibleGround) ** EXPOSURE_GAMMA },
    // Existing plant, cast-shadow and lamp tints retain their original ground input.
    accents: { irr, air, ground: reflectedGround(srgbRgbToLinear(nearby), irr, .18, 1) },
  }
  memo.set(world, result)
  return result
}

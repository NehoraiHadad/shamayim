import { lambert, type Normal } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'
import { halfDepthLightOf } from '../../world/halfDepthLight'
import { aerosolDepth } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import { buildingSurroundings } from './buildingLight'
import { illustratedTonesAt, type IllustratedTones } from './illustratedTones'
import { linearRgbToSrgb, shadeLinearRgb, srgbRgbToLinear } from './landRadiance'
import { skyReflection, twilightShare } from './landSkyIrradiance'
import { aerialFor, hazeAt } from './landVeil'
import { solarSkyGlows, sunwardHorizon } from './skyGlows'
import { mixLight, rgbOf } from './tone'

// Linear RGB gold at normal incidence, the Gold row of Epic Games' measured metal base colours.
// https://dev.epicgames.com/documentation/en-us/unreal-engine/physically-based-materials-in-unreal-engine
export const GOLD_F0: RGB = [1, .766, .336]
const SILVER_F0: RGB = [.89, .91, .92]

/** Rough conductor in the camera frame. V is toward the eye, so R = 2(N·V)N − V. */
export function metalLight(world: WorldState, km: number, f0: RGB = GOLD_F0) {
  const { irr, ground, air } = buildingSurroundings(world)
  const tau = .099 + aerosolDepth(world.air)[1], haze = hazeAt(world, km)
  const horizon = rgbOf(world.light.palette.horizon)
  // Sample at eye level on the Sun's meridian in the reference projection.
  const glows = twilightShare(irr.sunAlt) > 0 ? solarSkyGlows(world, 0, 0, 1) : []
  const lobe = glows.length ? sunwardHorizon(horizon, glows, world.bodies.sun.x, world.relief.horizonY)
    : srgbRgbToLinear(horizon)
  const skyAt = skyReflection(world.light, irr.sunAlt, tau, irr.eSkyVec, lobe, 5.7)
  const sunHorizontal = Math.hypot(irr.sunDir.across, irr.sunDir.ahead) || 1
  return (n: Normal): RGB => {
    const nv = Math.max(0, -n[1]), r: Normal = [2 * nv * n[0], 1 + 2 * nv * n[1], 2 * nv * n[2]]
    const towardSun = (r[0] * irr.sunDir.across + r[1] * irr.sunDir.ahead) / sunHorizontal
    const sky = skyAt(.16 + .62 * r[2], .79 * towardSun)
    const open = smoothstep(-.45, .32, r[2])
    const reflection: RGB = [0, 1, 2].map(i => ground[i] + (sky[i] - ground[i]) * open) as [number, number, number]
    // Normalized broad cosine lobe for the tiled metal. Its input is the terrain's attenuated beam.
    const lobe = lambert(n, irr.sunDir) * lambert(r, irr.sunDir) ** 2.7 * 1.8
    return linearRgbToSrgb(shadeLinearRgb(f0, irr.eSunVec, irr.eMoonVec, reflection, lobe, 0, 1, irr.yHorizon, haze, air))
  }
}

const DOME_X = [-1, -2/3, -1/3, 0, 1/3, 2/3, 1]
const DOME_UP = [.05, .35, .65, .94]

export type FloodlitDome = Pick<IllustratedTones, 'gold' | 'rim' | 'shade' | 'refl'>
export interface DomeFloodlight { strength: number; tones: FloodlitDome }

/** Bring the floodlights up through twilight, independent of the moonlit metal. */
export function floodlitDome(world: WorldState, km: number, convert: (rgb: RGB) => RGB): DomeFloodlight | undefined {
  const strength = smoothstep(-6, -24, world.bodies.sun.altitude)
  if (!strength) return
  const lampWorld = { ...world, light: halfDepthLightOf(world.light) }
  const legacy = illustratedTonesAt(lampWorld, km)
  const fog = world.air.mist?.fog ?? 0
  const local = fog ? illustratedTonesAt(lampWorld, 0) : legacy
  const aerial = aerialFor(world)
  const tone = (key: keyof FloodlitDome) => convert(fog ? mixLight(legacy[key], aerial(local[key], km), fog) : legacy[key])
  return { strength, tones: { gold: tone('gold'), rim: tone('rim'), shade: tone('shade'), refl: tone('refl') } }
}

export function domeSectors(world: WorldState, km: number): RGB[][] {
  const gold = metalLight(world, km)
  return DOME_UP.map(up => DOME_X.map(x => {
    const radius = Math.sqrt(1 - up * up)
    return gold([radius * x, -radius * Math.sqrt(1 - x * x), up])
  }))
}

export const silverLight = (world: WorldState, km: number) => metalLight(world, km, SILVER_F0)

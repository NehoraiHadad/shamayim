import { lambert, type Normal } from '../../world/livingLight'
import { smoothstep } from '../../world/ridgeLighting'
import { aerosolDepth } from '../../world/sceneLight'
import type { RGB, WorldState } from '../../world/types'
import { buildingSurroundings } from './buildingLight'
import { linearRgbToSrgb, shadeLinearRgb } from './landRadiance'
import { skyReflection } from './landSkyIrradiance'
import { hazeAt } from './landVeil'

const GOLD_F0: RGB = [.95, .73, .13]
const SILVER_F0: RGB = [.89, .91, .92]

/** Rough conductor in the camera frame. V is toward the eye, so R = 2(N·V)N − V. */
export function metalLight(world: WorldState, km: number, f0: RGB = GOLD_F0) {
  const { irr, ground, air } = buildingSurroundings(world)
  const tau = .099 + aerosolDepth(world.air)[1], haze = hazeAt(world, km)
  const skyAt = skyReflection(world.light, irr.sunAlt, tau, irr.eSkyVec)
  const sunHorizontal = Math.hypot(irr.sunDir.across, irr.sunDir.ahead) || 1
  return (n: Normal): RGB => {
    const nv = Math.max(0, -n[1]), r: Normal = [2 * nv * n[0], 1 + 2 * nv * n[1], 2 * nv * n[2]]
    const towardSun = (r[0] * irr.sunDir.across + r[1] * irr.sunDir.ahead) / sunHorizontal
    const sky = skyAt(r[2], towardSun)
    const open = smoothstep(-.24, .24, r[2])
    const reflection: RGB = [0, 1, 2].map(i => ground[i] + (sky[i] - ground[i]) * open) as [number, number, number]
    // Normalized broad cosine lobe for the tiled metal. Its input is the terrain's attenuated beam.
    const lobe = lambert(n, irr.sunDir) * lambert(r, irr.sunDir) ** 6 * 2.8
    return linearRgbToSrgb(shadeLinearRgb(f0, irr.eSunVec, irr.eMoonVec, reflection, lobe, 0, 1, irr.yHorizon, haze, air))
  }
}

const DOME_X = [-.93, -.70, -.35, 0, .35, .70, .93]
const DOME_UP = [.05, .40, .76, .97]

export function domeSectors(world: WorldState, km: number): RGB[][] {
  const gold = metalLight(world, km)
  return DOME_UP.map(up => DOME_X.map(x => {
    const radius = Math.sqrt(1 - up * up)
    return gold([radius * x, -radius * Math.sqrt(1 - x * x), up])
  }))
}

export const silverLight = (world: WorldState, km: number) => metalLight(world, km, SILVER_F0)

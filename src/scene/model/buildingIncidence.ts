import { lambert, type Normal } from '../../world/livingLight'
import type { RGB } from '../../world/types'
import { groundView, type Surroundings } from './buildingGround'
import type { drawnTwilightScreen } from './drawnArchitectureLight'
import { skyView } from './landIrradiance'
import { linearRgbToSrgb, shadeLinearRgb } from './landRadiance'

export function incidence({ irr, ground }: Surroundings, drawnScreen?: ReturnType<typeof drawnTwilightScreen>) {
  const memo = new WeakMap<Normal, { sky: number; ground: number; sun: number; moon: number }>()
  const { sunDir } = irr
  return (n: Normal, open = 1, beam = open, groundOpen = open) => {
    let face = memo.get(n)
    if (!face) {
      // A vertical face sees half the broad sky dome and half the ground.
      // Eave and street occlusion are applied by the caller's view factors.
      const screen = drawnScreen?.(n)
      face = { sky: skyView(n, sunDir, irr.skyBias) * (screen?.sky ?? 1), ground: groundView(n) * (screen?.ground ?? 1),
        sun: lambert(n, sunDir), moon: lambert(n, irr.moonDir) }
      memo.set(n, face)
    }
    const sky = face.sky * open, bounce = face.ground * groundOpen
    const sun = beam * face.sun, moon = beam * face.moon
    const channel = (i: 0 | 1 | 2) => irr.eSunVec[i] * sun + irr.eMoonVec[i] * moon + irr.eSkyVec[i] * sky + ground[i] * bounce
    return [channel(0), channel(1), channel(2)] as RGB
  }
}

/** The established receiver for plants, lamp tints and architecture contact shadows. */
export function accentSurface({ irr, ground, air }: Surroundings, share: number) {
  return (rho: RGB, n: Normal, open = 1, beam = 1) => {
    const view = skyView(n, irr.sunDir, irr.skyBias) * open, bounce = groundView(n)
    const channel = (i: 0 | 1 | 2) => irr.eSkyVec[i] * view + ground[i] * bounce
    return linearRgbToSrgb(shadeLinearRgb(rho, irr.eSunVec, irr.eMoonVec, [channel(0), channel(1), channel(2)],
      beam * lambert(n, irr.sunDir), beam * lambert(n, irr.moonDir), 1, irr.yHorizon, share, air))
  }
}

import { smoothstep } from '../../domain/smoothstep'
import { lambert, type Normal } from '../../world/livingLight'
import type { RGB } from '../../world/types'
import { groundView, type Surroundings } from './buildingGround'
import { skyView } from './landIrradiance'
import { linearRgbToSrgb, shadeLinearRgb } from './landRadiance'

export function twilightStreetScreen(irr: Surroundings['irr']) {
  const { sunDir } = irr, horizontal = Math.hypot(sunDir.across, sunDir.ahead) || 1
  const horizonFill = smoothstep(13, 2, irr.sunAlt) * smoothstep(-13, -4, irr.sunAlt)
  return (n: Normal) => {
    // Roofs screen low twilight from street walls. The sunward side sees more of the bright band.
    const toward = (n[0] * sunDir.across + n[1] * sunDir.ahead) / horizontal
    const screen = (1 - Math.abs(n[2])) * horizonFill
    return { sky: 1 - screen * (.998 - .28 * (.5 + .5 * toward) ** 3), ground: 1 - .83 * screen }
  }
}

export function incidence({ irr, ground }: Surroundings) {
  const memo = new WeakMap<Normal, { sky: number; ground: number; sun: number; moon: number }>()
  const screenAt = twilightStreetScreen(irr), { sunDir } = irr
  return (n: Normal, open = 1, beam = open, groundOpen = open) => {
    let face = memo.get(n)
    if (!face) {
      const screen = screenAt(n)
      face = { sky: skyView(n, sunDir, irr.skyBias) * screen.sky, ground: groundView(n) * screen.ground,
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

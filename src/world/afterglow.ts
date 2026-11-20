import { sunLight, type Aerosol } from './sceneLight'

/**
 * Afterglow (and its dawn twin): once the sun is down, the valley lies in Earth's shadow but clouds above it still see
 * the sun. The shadow climbs as the sun sinks, so low clouds go grey first and the highest keep their colour longest.
 * From ~3° above the horizon until ~5° below it, when even cirrus at ~10 km falls into the shadow; published until
 * ~7° below for Earth's shadow on the eastern (dawn: western) sky.
 */
export const AFTERGLOW = { from: 3, to: -7 } as const

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * The light still reaching the clouds: the sun's colour through ever longer air (gold, orange, red), turning pink as
 * the sun sinks, when only red direct light is left and the blue of the sky above mixes into the lit cloud faces.
 */
export function afterglowColour(altitude: number, air: Aerosol = {}) {
  const { rgb } = sunLight(Math.max(0.3, altitude), air)
  const pink = [1, 0.42, 0.55]
  const t = 0.75 * smooth(-altitude / 3)
  return rgb.map((v, i) => v + (pink[i] - v) * t) as [number, number, number]
}


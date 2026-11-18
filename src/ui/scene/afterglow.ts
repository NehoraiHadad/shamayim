import { sunLight, type Aerosol } from './sceneLight'

/**
 * Afterglow (and its dawn twin): once the sun is down, the valley lies in Earth's shadow but clouds above it still see
 * the sun. The shadow climbs as the sun sinks, so low clouds go grey first and the highest keep their colour longest.
 * From ~3° above the horizon until ~5° below it, when even cirrus at ~10 km falls into the shadow.
 */
export const AFTERGLOW = { from: 3, to: -5 } as const

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

/** The data attributes the air reads for the afterglow, or none when it is not the hour for one. */
export function afterglowAttrs(altitude: number | null, x: number | null, air: Aerosol) {
  if (altitude === null || x === null || altitude >= AFTERGLOW.from || altitude <= AFTERGLOW.to) return {}
  return {
    'data-afterglow': altitude.toFixed(2),
    'data-afterglow-x': x.toFixed(3),
    'data-afterglow-rgb': afterglowColour(altitude, air).map((v) => v.toFixed(3)).join(','),
  }
}

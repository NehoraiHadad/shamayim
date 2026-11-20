import { aerosolDepth, sunLight, type Aerosol } from '../world/sceneLight'
import { mixOklab } from './oklab'

const smoothstep = (lo: number, hi: number, value: number) => {
  const x = Math.min(1, Math.max(0, (value - lo) / (hi - lo)))
  return x * x * (3 - 2 * x)
}

const hex = (rgb: readonly number[]) => `#${rgb.map((v) => Math.round(Math.min(1, v) * 255).toString(16).padStart(2, '0')).join('')}`

/**
 * The hour's aerosol on the clear-sky gradient (the lit scene). Haze scatters sunlight almost evenly in colour (Mie),
 * so by day it whitens the horizon and a little of the mid sky; near sunrise and sunset the same particles lie along
 * the low sun's long path and tint the horizon with the sun's own reddened light. Clean air leaves the table as it is.
 */
export function skyAir(sky: { mid: string; horizon: string }, altitude: number, air: Aerosol) {
  const tau = aerosolDepth(air)[1]
  const milk = smoothstep(0.15, 1.1, tau) * smoothstep(-2, 8, altitude)
  // Haze over a sunlit day is milky white; dust is buff.
  const veil = air.dust ? '#D9CDB4' : '#D7DCE0'
  let horizon = mixOklab(sky.horizon, veil, 0.6 * milk)
  const mid = mixOklab(sky.mid, veil, 0.22 * milk)
  const low = smoothstep(6, 1, altitude) * smoothstep(-5, -1, altitude)
  if (low > 0) horizon = mixOklab(horizon, hex(sunLight(Math.max(0.3, altitude), air).rgb), 0.45 * low * smoothstep(0.08, 0.8, tau))
  return { mid, horizon }
}

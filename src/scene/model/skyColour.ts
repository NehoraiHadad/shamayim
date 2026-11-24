import { luminance, skyContrastCeiling } from '../../theme/contrast'
import type { WorldState } from '../../world/types'
import { cityOnSky } from './cityLight'
import { luminanceOf } from './cloudChromaticity'
import { dustSky } from './cloudDust'
import { hexOf, rgbOf, scaleLight } from './tone'
import type { RGB } from './types'

/** Scale all linear channels together. Check the rounded CSS colour against the same luminance ceiling. */
function limit(rgb: RGB, ceiling: number, roundedCeiling: number): RGB {
  const y = luminanceOf(rgb)
  if (y <= ceiling && luminance(hexOf(rgb)) <= roundedCeiling) return rgb
  let low = 0, high = Math.min(1, ceiling / y)
  const scaled = scaleLight(rgb, high)
  if (luminance(hexOf(scaled)) <= roundedCeiling) return scaled
  // Bisect to finer than a single sRGB byte even at the steepest part of the transfer curve.
  while ((high - low) * 255 * 12.92 > 1) {
    const middle = (low + high) / 2
    if (luminance(hexOf(scaleLight(rgb, middle))) <= roundedCeiling) low = middle
    else high = middle
  }
  return scaleLight(rgb, low)
}

export function skyColours(world: WorldState) {
  const { palette } = world.light
  const veiled = dustSky(world)
  const [t, m, h] = veiled ?? [rgbOf(palette.top), rgbOf(palette.mid), rgbOf(palette.horizon)]
  const top = cityOnSky(world, t, 90)
  const mid = cityOnSky(world, m, 30)
  const horizon = cityOnSky(world, h, 0)
  if (!veiled) return { top, mid, horizon, veiled: false }
  const ink = skyContrastCeiling(palette.ink)
  const midInk = Math.min(ink, skyContrastCeiling('#E8F9FF'))
  const guardedMid = limit(mid, Math.min(midInk, luminanceOf(horizon)), Math.min(midInk, luminance(hexOf(horizon))))
  const guardedTop = limit(top, Math.min(ink, luminanceOf(guardedMid)), Math.min(ink, luminance(hexOf(guardedMid))))
  return { top: guardedTop, mid: guardedMid, horizon, veiled: true }
}

import { SKY_THEMES } from '../../theme/skyThemes'
import type { RGB, WorldState } from '../../world/types'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { rgbOf, toSrgb } from './tone'

// The horizon-to-mid band (0–30 degrees) supplies sin²(30°) of downwelling irradiance.
function domeFill(mid: RGB, horizon: RGB): RGB {
  const m = srgbRgbToLinear(mid), h = srgbRgbToLinear(horizon)
  return [0.75 * m[0] + 0.25 * h[0], 0.75 * m[1] + 0.25 * h[1], 0.75 * m[2] + 0.25 * h[2]]
}

const fillOf = (palette: Pick<WorldState['light']['palette'], 'mid' | 'horizon'>) =>
  domeFill(rgbOf(palette.mid), rgbOf(palette.horizon))
const nightL = Math.cbrt(linearLuminance(fillOf(SKY_THEMES.night)))
const clearY = linearLuminance(fillOf(SKY_THEMES.clearDay))
const cloudyY = linearLuminance(fillOf(SKY_THEMES.cloudy))
const exposure = new WeakMap<WorldState, number>()

export function cloudFill(world: WorldState): RGB {
  return domeFill(world.light.ambient, rgbOf(world.light.palette.horizon))
}

export function cloudExposure(world: WorldState): number {
  const known = exposure.get(world)
  if (known !== undefined) return known
  const y = linearLuminance(cloudFill(world))
  const dayY = clearY + world.light.diffuse * (cloudyY - clearY)
  // Cube-root display lightness, measured against the cloudy and clear daylight palette endpoints.
  const day = Math.min(1, Math.max(0, (Math.cbrt(y) - nightL) / (Math.cbrt(dayY) - nightL)))
  exposure.set(world, day)
  return day
}

/** Replace a fraction of the fill's source spectrum at fixed display luminance. */
export function tintFill(body: RGB, source: RGB, share: number): RGB {
  const y = linearLuminance(source)
  if (!(y > 0 && share > 0)) return body
  const base = srgbRgbToLinear(body), baseY = linearLuminance(base)
  const delta: RGB = [0, 1, 2].map((i) => share * (source[i] * baseY / y - base[i])) as unknown as RGB
  let scale = 1
  for (let i = 0; i < 3; i++) {
    const d = delta[i]
    if (d > 0) scale = Math.min(scale, (1 - base[i]) / d)
    if (d < 0) scale = Math.min(scale, -base[i] / d)
  }
  return [toSrgb(base[0] + scale * delta[0]), toSrgb(base[1] + scale * delta[1]), toSrgb(base[2] + scale * delta[2])]
}

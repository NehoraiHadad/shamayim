import { smoothstep } from '../../domain/smoothstep'
import { SKY_THEMES } from '../../theme/skyThemes'
import type { RGB, WorldState } from '../../world/types'
import { linearAtCloudLuminance } from './cloudChromaticity'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { mixLight, rgbOf } from './tone'

// The horizon-to-mid band (0–30 degrees) supplies sin²(30°) of downwelling irradiance.
function domeFill(mid: RGB, horizon: RGB): RGB {
  const m = srgbRgbToLinear(mid), h = srgbRgbToLinear(horizon)
  return [0.75 * m[0] + 0.25 * h[0], 0.75 * m[1] + 0.25 * h[1], 0.75 * m[2] + 0.25 * h[2]]
}

export function cloudFill(world: WorldState): RGB {
  return domeFill(world.light.ambient, rgbOf(world.light.palette.horizon))
}

export function twilightWeight(altitude: number) {
  // The rose scattering band dominates between −2° and 4°. Ease in from civil
  // twilight and out to the sky palette's established 7° daylight transition.
  return smoothstep(-6, -2, altitude) * (1 - smoothstep(4, 7, altitude))
}

export function twilightCloudFill(world: WorldState): RGB {
  const twilight = world.bodies.sun.azimuth < 180 ? SKY_THEMES.dawn : SKY_THEMES.dusk
  const rose = mixLight(rgbOf(twilight.mid), rgbOf(twilight.horizon), 0.25)
  return srgbRgbToLinear(rose)
}

/** Replace a fraction of the fill's source spectrum at fixed display luminance. */
export function tintFill(body: RGB, source: RGB, share: number): RGB {
  const y = linearLuminance(source)
  if (!(y > 0 && share > 0)) return body
  const base = srgbRgbToLinear(body), baseY = linearLuminance(base)
  const mix = (i: 0 | 1 | 2) => (1 - share) * base[i] + share * source[i] * baseY / y
  return linearAtCloudLuminance([mix(0), mix(1), mix(2)], baseY)
}

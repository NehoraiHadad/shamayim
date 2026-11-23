import { clearSkyColours } from '../../theme/skyLight'
import { airMass } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import { atCloudLuminance } from './cloudChromaticity'
import { dustDepth } from './cloudDust'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { rgbOf, toSrgb } from './tone'
import type { RGB } from './types'

const luminance = (rgb: RGB) => linearLuminance(srgbRgbToLinear(rgb))

/** Grey-band radiative transfer with the sunlit horizon as the airlight source. */
export function dustSkyY(clearY: number, horizonY: number, depth: number, elevation: number): number {
  // The diffuse field crosses two vertical columns on average (2∫₀¹ μ/μ dμ).
  // Toward the horizon the longer viewing column determines the transmission.
  const transmission = Math.exp(-depth * Math.max(2, airMass(elevation)))
  // Use 0.9, the review's conservative red-band single-scattering albedo for coarse dust.
  return clearY * transmission + 0.9 * horizonY * (1 - transmission)
}

export function dustSkyColours(world: WorldState, colours: [RGB, RGB, RGB]): [RGB, RGB, RGB] {
  const depth = dustDepth(world.air)
  if (!depth) return colours
  const { altitude, azimuth } = world.bodies.sun
  const clear = clearSkyColours(altitude, azimuth < 180)
  const horizonY = luminance(colours[2])
  const lift = (rgb: RGB, i: number, elevation: number) => {
    const y = dustSkyY(luminance(rgbOf(clear[i])), horizonY, depth, elevation)
    if (y <= luminance(rgb)) return rgb
    const grey = toSrgb(y)
    // The horizon supplies the source spectrum, including the palette's pale dust tint.
    return atCloudLuminance(colours[2], [grey, grey, grey])
  }
  return [lift(colours[0], 0, 90), lift(colours[1], 1, 30), lift(colours[2], 2, 0)]
}

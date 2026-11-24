import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { toSrgb } from './tone'
import type { RGB } from './types'

type Linear = readonly [number, number, number]

export const luminanceOf = (rgb: RGB) => linearLuminance(srgbRgbToLinear(rgb))

/** A light's own colour at the luminance `y`: what leaves sRGB there moves toward the grey of the same `y`, never clips. */
export function atLuminance(light: Linear, y: number): RGB {
  const factor = y / linearLuminance(light)
  const peak = Math.max(...light) * factor
  const keep = peak > 1 ? (1 - y) / (peak - y) : 1
  const band = (v: number) => toSrgb(y + keep * (v * factor - y))
  return [band(light[0]), band(light[1]), band(light[2])]
}

/** `rgb` with a share of its light in another light's colour, its luminance kept. */
export function tinted(rgb: RGB, light: RGB, share: number): RGB {
  const own = srgbRgbToLinear(rgb), other = srgbRgbToLinear(light)
  const y = linearLuminance(own), otherY = linearLuminance(other)
  if (!(share > 0 && y > 0 && otherY > 0)) return rgb
  const band = (i: 0 | 1 | 2) => (1 - share) * own[i] + share * other[i] * y / otherY
  return atLuminance([band(0), band(1), band(2)], y)
}

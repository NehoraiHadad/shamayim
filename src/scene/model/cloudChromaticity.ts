import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { labOf, scaleLight, toSrgb } from './tone'
import type { RGB } from './types'

/** Carry the source chromaticity at the reference tone's calibrated linear Y. */
export function atCloudLuminance(source: RGB, reference: RGB): RGB {
  const y = linearLuminance(srgbRgbToLinear(reference))
  return linearAtCloudLuminance(srgbRgbToLinear(source), y)
}

export function linearAtCloudLuminance(linear: RGB, y: number): RGB {
  const sourceY = linearLuminance(linear)
  if (sourceY === 0) return [toSrgb(y), toSrgb(y), toSrgb(y)]
  const factor = y / sourceY
  const peak = Math.max(...linear) * factor
  // Intersect the constant-Y segment from neutral grey to the target with the sRGB cube.
  const chroma = peak > 1 ? (1 - y) / (peak - y) : 1
  return [
    toSrgb(y + chroma * (linear[0] * factor - y)),
    toSrgb(y + chroma * (linear[1] * factor - y)),
    toSrgb(y + chroma * (linear[2] * factor - y)),
  ]
}

/** Limit the chroma of a lit face relative to its neighbouring body at twilight. */
export function limitCloudChroma(lit: RGB, body: RGB): RGB {
  const chromaOf = (rgb: RGB) => { const { a, b } = labOf(rgb); return Math.hypot(a, b) }
  const ceiling = 1.5 * chromaOf(body)
  if (chromaOf(lit) <= ceiling) return lit
  const linear = srgbRgbToLinear(lit), y = linearLuminance(linear)
  let lo = 0, hi = 1
  let colour = scaleLight([1, 1, 1], y)
  // Search along the same constant-Y line as gamut mapping, to 8-bit precision.
  for (let i = 0; i < 8; i++) {
    const t = (lo + hi) / 2
    const candidate: RGB = [toSrgb(y + t * (linear[0] - y)), toSrgb(y + t * (linear[1] - y)),
      toSrgb(y + t * (linear[2] - y))]
    if (chromaOf(candidate) <= ceiling) { lo = t; colour = candidate } else hi = t
  }
  return colour
}

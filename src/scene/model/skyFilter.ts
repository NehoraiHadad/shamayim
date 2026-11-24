import { luminanceOf } from './cloudChromaticity'
import type { RGB } from './types'

// The spectral dependence of mineral-dust absorption is measured by Linke et al.
// (2006), doi:10.5194/acp-6-3315-2006. Painter's choice for sRGB multiply:
// use exponent 1.5 and the long-wave red edge (700 nm) for 0.696, 1, 1.398.
const absorption = [700, 550, 440].map(wavelength => (550 / wavelength) ** 1.5)

// Keep full strength through the mid sky, then meet the horizon tangentially.
export const SKY_FILTER_MID = 0.55

export function skyFilterWeight(row: number): number {
  const t = Math.max(0, Math.min(1, (row - SKY_FILTER_MID) / (1 - SKY_FILTER_MID)))
  return 1 - t * t * (3 - 2 * t)
}

export function skyFilterTransmission(k: number, row: number): [number, number, number] {
  const depth = k * skyFilterWeight(row)
  return [Math.exp(-depth * absorption[0]), Math.exp(-depth), Math.exp(-depth * absorption[2])]
}

export const multiplySky = (rgb: RGB, [r, g, b]: RGB): RGB => [rgb[0] * r, rgb[1] * g, rgb[2] * b]

const BYTE = 1 / 255

/** Headroom for raster, filter and destination rounding in encoded sRGB. */
export function skyFilterReserve(rgb: RGB): number {
  const halfByte = BYTE / 2
  // The filter's error is scaled by its source channel. The inner bound
  // occurs at unit transmission and bounds the error for every depth.
  const upper = rgb.map(c => c + halfByte * (2 + c + halfByte)) as unknown as RGB
  return luminanceOf(upper) - luminanceOf(rgb)
}

/** Distribute stops by the square root of curvature, since chord error scales as curvature × width². */
export function skyFilterGradientRows(k: number, intervals: number): number[] {
  // Four midpoint samples per interval resolve the curvature of the cubic shoulder.
  const bins = 4 * intervals
  const cumulative = [0]
  for (let i = 0; i < bins; i++) {
    const t = (i + 0.5) / bins
    const w = 1 - t * t * (3 - 2 * t), slope = 6 * t * (1 - t), second = 6 - 12 * t
    const curvature = Math.max(...absorption.map(coefficient => {
      const depth = k * coefficient
      return Math.exp(-depth * w) * depth * Math.abs(second + depth * slope * slope)
    }))
    cumulative.push(cumulative[i] + Math.sqrt(curvature))
  }
  let bin = 0
  return [SKY_FILTER_MID, ...Array.from({ length: intervals - 1 }, (_, i) => {
    const target = cumulative[bins] * (i + 1) / intervals
    while (cumulative[bin + 1] < target) bin++
    const t = (bin + (target - cumulative[bin]) / (cumulative[bin + 1] - cumulative[bin])) / bins
    return SKY_FILTER_MID + (1 - SKY_FILTER_MID) * t
  }), 1]
}

/** Minimum depth for this swatch, with a quadratic knee below the ceiling. */
export function skyFilterDepth(rgb: RGB, ceiling: number, rounding: number, minimum = 0): number {
  const y = luminanceOf(rgb)
  const cap = Math.max(0, ceiling - rounding)
  const start = cap - rounding
  if (y <= start) return minimum
  const fraction = rounding ? Math.min(1, (y - start) / (2 * rounding)) : 1
  const target = fraction === 1 ? cap : y - rounding * fraction * fraction
  if (y <= target) return minimum
  const at = (k: number) => luminanceOf(multiplySky(rgb, skyFilterTransmission(k, 0)))
  if (minimum && at(minimum) <= target) return minimum
  let lo = minimum, hi = Math.max(minimum * 2, 1)
  while (at(hi) > target) hi *= 2
  // Resolve the depth to 1/256 of a display code, leaving byte rounding to the caller.
  while (hi - lo > BYTE / 256) {
    const mid = (lo + hi) / 2
    if (at(mid) <= target) hi = mid
    else lo = mid
  }
  const y0 = at(lo), y1 = at(hi)
  return y0 > y1 ? lo + (hi - lo) * (y0 - target) / (y0 - y1) : hi
}

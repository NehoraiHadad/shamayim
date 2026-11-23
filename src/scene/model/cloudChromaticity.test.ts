import { expect, it } from 'vitest'
import { atCloudLuminance, limitCloudChroma } from './cloudChromaticity'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { labOf } from './tone'
import type { RGB } from './types'

const y = (rgb: RGB) => linearLuminance(srgbRgbToLinear(rgb))
const c = (rgb: RGB) => { const { a, b } = labOf(rgb); return Math.hypot(a, b) }

it('keeps calibrated cloud luminance through gamut compression', () => {
  const source: RGB = [1, 0.2, 0.05]
  const reference: RGB = [0.86, 0.86, 0.86]
  const lit = atCloudLuminance(source, reference)
  expect(y(lit)).toBeCloseTo(y(reference), 12)
  expect(lit[0]).toBeCloseTo(1, 12)
  expect(lit[0]).toBeGreaterThan(lit[1])
  expect(lit[1]).toBeGreaterThan(lit[2])
})

it('limits red highlights relative to the body without darkening them', () => {
  const lit: RGB = [0.85, 0.32, 0.27]
  const body: RGB = [0.65, 0.57, 0.59]
  const limited = limitCloudChroma(lit, body)
  expect(c(limited)).toBeLessThanOrEqual(1.5 * c(body))
  expect(y(limited)).toBeCloseTo(y(lit), 12)
})


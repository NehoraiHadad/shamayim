import { expect, it } from 'vitest'
import { shadeLinearRgb } from './landRadiance'

it('mixes path scattering before restricting the display gamut', () => {
  const sun = [6, 0.4, 0.7] as const
  const air = [0.16, 0.21, 0.31] as const
  const black = [0, 0, 0] as const
  const shade = (h: number) => shadeLinearRgb([1, 0.8, 0.7], sun, black, black, 1, 0, 0, 0.7, h, air)
  const raw = shade(0)
  expect(raw[0]).toBeGreaterThan(1)
  shade(0.8).forEach((channel, i) => expect(channel).toBeCloseTo(0.2 * raw[i] + 0.8 * air[i], 10))
  expect(shade(0.8).every((channel) => channel < 1)).toBe(true)
})

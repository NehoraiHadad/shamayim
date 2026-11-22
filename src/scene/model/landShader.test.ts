import { expect, it } from 'vitest'
import { shadeLinearRgb } from './landRadiance'

it('compresses the reflected irradiance before adding haze, with gamut left to the encoder', () => {
  const black = [0, 0, 0] as const
  // Luminance 1 with a red channel above gamut. The exposure of 1 leaves that luminance unchanged.
  const red = 1 / 0.2126
  const raw = shadeLinearRgb([1, 1, 1], [red, 0, 0], black, black, 1, 0, 0, 1)
  expect(raw[0]).toBeCloseTo(4.70367, 5)
  const hazed = shadeLinearRgb([1, 1, 1], [red, 0, 0], black, black, 1, 0, 0, 1, 0.9, [0.2, 0.3, 0.4])
  expect(hazed).toEqual([expect.closeTo(0.650367, 6), expect.closeTo(0.27, 8), expect.closeTo(0.36, 8)])
  // A neutral 1/32 input under unit exposure compresses to 1/8 (0.6 = 3/5).
  expect(shadeLinearRgb([0.125, 0.125, 0.125], black, black, [0.25, 0.25, 0.25], 0, 0, 1, 1))
    .toEqual([expect.closeTo(0.125, 10), expect.closeTo(0.125, 10), expect.closeTo(0.125, 10)])
})

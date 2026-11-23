import { expect, it } from 'vitest'
import { dustSkyY } from './dustSky'

it('transmits the clear sky and adds sunlit dust airlight', () => {
  const clear = 0.08, horizon = 0.45
  expect(dustSkyY(clear, horizon, 0, 90)).toBe(clear)
  const zenith = dustSkyY(clear, horizon, 0.5, 90)
  expect(zenith).toBeCloseTo(clear / Math.E + 0.9 * horizon * (1 - 1 / Math.E), 10)
  expect(zenith / horizon).toBeCloseTo(0.63, 2)
  expect(dustSkyY(clear, horizon, 0.5, 15)).toBeGreaterThan(zenith)
})

import { expect, it } from 'vitest'
import { roofHeight } from './skylineHeight'

it('uses storey and unmapped priors, biases the variation low, and caps roofs at 60 m', () => {
  expect(roofHeight(3, 0, .8)).toBeCloseTo(10.3)
  expect(roofHeight(0, 0, 0)).toBe(10)
  expect(roofHeight(0, 4, 0)).toBe(7)
  expect(roofHeight(0, 8, 0)).toBe(8)
  expect(roofHeight(0, 18, 0)).toBe(10)
  expect(roofHeight(0, 30, .5)).toBe(15)
  expect(roofHeight(15, 255, 1)).toBe(60)
})

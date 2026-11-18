import { expect, it } from 'vitest'
import { homeRoof, roofHeight } from './skylineHeight'

it('uses storey and unmapped priors, biases the variation low, and caps roofs at 60 m', () => {
  expect(roofHeight(3, 0, .8)).toBeCloseTo(10.3)
  expect(roofHeight(0, 0, 0)).toBe(10)
  expect(roofHeight(0, 4, 0)).toBe(7)
  expect(roofHeight(0, 8, 0)).toBe(8)
  expect(roofHeight(0, 18, 0)).toBe(10)
  expect(roofHeight(0, 30, .5)).toBe(15)
  expect(roofHeight(15, 255, 1)).toBe(60)
})

it('raises the eye by the cover-weighted median, limited to 20 m', () => {
  const place = { lat: 32, lon: 35 }
  expect(homeRoof(place, { at: () => ({ built: .09, levels: 12, p90: 50 }) })).toBe(0)
  expect(homeRoof(place, { at: () => ({ built: .6, levels: 12, p90: 50 }) })).toBe(20)
  expect(homeRoof(place, { at: (_lat, lon) => lon < place.lon
    ? { built: 1, levels: 3, p90: 30 } : { built: .15, levels: 12, p90: 50 } })).toBeCloseTo(10.3)
})

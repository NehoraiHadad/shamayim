import { expect, it } from 'vitest'
import { sheetPaintBound } from './cloudPaintBounds'

it('bounds the lit sheet cap and its thickening of an open cell', () => {
  const lit = [0.85, 0.85, 0.85] as const
  const cap = sheetPaintBound({ lattice: 'low', body: lit, shade: lit, lit })
  // At half opacity the billow mask can be one. A fully lit cap takes 55% white.
  expect(cap.alpha(0.5)).toBeGreaterThanOrEqual(0.94 * 0.5 ** 0.55)
  expect(cap.bright[0]).toBeCloseTo(0.9325, 10)
  expect(cap.alpha(0)).toBe(0)
})

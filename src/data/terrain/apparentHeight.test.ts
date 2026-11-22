import { expect, it } from 'vitest'
import { anglePx } from './angleScale'
import { apparentHeight, baseAngle } from './apparentHeight'

it.each([-20, -6, 0, 6, 20])('resolves a drawn base at %i degrees', a0 => {
  expect(baseAngle(100 - anglePx(a0), 100)).toBeCloseTo(a0, 8)
  const rise = Math.atan(17 / 6460) * 180 / Math.PI
  expect(apparentHeight(17, 6.46, a0)).toBeCloseTo(anglePx(a0 + rise) - anglePx(a0), 10)
})

it('reduces the projected rise where the panorama relief flattens at higher elevations', () => {
  expect(apparentHeight(17, 6.46, 15)).toBeLessThan(apparentHeight(17, 6.46, 0) / 3)
})

import { describe, expect, it } from 'vitest'
import { altitudeY, skylineOf } from './skyline'

// A ridge high in the east (right) and low in the middle, like the Judean hills seen from the east slope.
const sky = skylineOf([[0, 54], [125, 54], [238, 68], [336, 34], [375, 34]], [[0, 72], [221, 80], [375, 48]])

describe('skyline', () => {
  it('follows the upper of the two ridges', () => {
    expect(sky(336 / 375)).toBeCloseTo(34)
    expect(sky(0)).toBeCloseTo(54)
  })

  it('puts 0° on the ridge, so a body rises and sets behind the line you see', () => {
    expect(altitudeY(sky, 336 / 375, 0)).toBeCloseTo(34)
    expect(altitudeY(sky, 336 / 375, -2)).toBeGreaterThan(34)
    expect(altitudeY(sky, 0, 3)).toBeLessThan(54)
  })

  it('keeps a body that is well up clear of the ridges, on one arc whatever the dip below it', () => {
    for (const x of [0.2, 0.5, 0.8]) expect(altitudeY(sky, x, 20)).toBeLessThan(sky(x) - 8)
    expect(altitudeY(sky, 0.5, 39)).toBeCloseTo(altitudeY(sky, 0.3, 39), 0)
    expect(altitudeY(sky, 0.5, 80)).toBeLessThan(altitudeY(sky, 0.5, 39))
  })

  it('climbs well clear of a high ridge at noon (a hill town near the top of the box)', () => {
    const high = skylineOf([[0, 40], [170, 22], [200, 20], [375, 36]])
    expect(altitudeY(high, 0.5, 39)).toBeLessThan(high(0.5) - 25)
  })
})

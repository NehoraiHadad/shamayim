import { describe, expect, it } from 'vitest'
import { cloudSightings } from '../../domain/cloudSightings'
import { cloudShare, readMask, SAMPLE_KM, SAMPLE_PX } from './cloudMask'

describe('cloudShare', () => {
  it('counts white pixels among opaque ones', () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 192, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0])
    expect(cloudShare(px)).toBeCloseTo(100 / 3)
  })
})

describe('readMask', () => {
  it('reads the middle 30 km for cover and the whole sample for single clouds', () => {
    const n = SAMPLE_PX
    const rgba = new Uint8ClampedArray(n * n * 4)
    for (let k = 0; k < n * n; k++) rgba.set([0, 200, 0, 255], k * 4)
    // One cloud pixel outside the middle 12×12: west, a little south.
    rgba.set([255, 255, 255, 255], (13 * n + 2) * 4)
    const got = readMask(rgba)!
    expect(got.cover).toBe(0)
    const [only, ...rest] = cloudSightings(got.mask, n, SAMPLE_KM)
    expect(rest).toHaveLength(0)
    expect(only.azimuth).toBeGreaterThan(260)
    expect(only.azimuth).toBeLessThan(270)
  })
  it('knows nothing of an image with no seen pixel in the middle', () => {
    expect(readMask(new Uint8ClampedArray(SAMPLE_PX * SAMPLE_PX * 4))).toBeNull()
  })
})

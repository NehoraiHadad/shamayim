import { describe, expect, it } from 'vitest'
import { cloudFront, cloudWarmth } from './cloudLight'

describe('cloudWarmth', () => {
  it('fades in smoothly across the lowest third of the sky', () => {
    expect(cloudWarmth(150, 300)).toBe(0)
    expect(cloudWarmth(200, 300)).toBe(0)
    expect(cloudWarmth(225, 300)).toBeCloseTo(0.15625)
    expect(cloudWarmth(250, 300)).toBeCloseTo(0.5)
    expect(cloudWarmth(300, 300)).toBe(1)
    expect(cloudWarmth(350, 300)).toBe(1)
  })

  it('uses a relative height and handles a scene with no sky height', () => {
    expect(cloudWarmth(125, 150)).toBeCloseTo(cloudWarmth(250, 300))
    expect(cloudWarmth(0, 0)).toBe(0)
  })
})

describe('cloudFront', () => {
  it('is full near the middle of the picture (noon) and gone toward rise and set', () => {
    expect(cloudFront(187, 375)).toBe(1)
    expect(cloudFront(322, 375)).toBe(0)
    expect(cloudFront(53, 375)).toBe(0)
    expect(cloudFront(250, 375)).toBeGreaterThan(0)
    expect(cloudFront(250, 375)).toBeLessThan(1)
    expect(cloudFront(10, 0)).toBe(0)
  })
})

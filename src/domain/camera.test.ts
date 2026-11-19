import { describe, expect, it } from 'vitest'
import { azimuthAt, fractionOf, lateral, SCENE_CAMERA, screenSide, spanDeg, STORED_CAMERA, toward, xOf, type Camera } from './camera'

describe('camera', () => {
  it('draws today\'s scene: south in the middle, east left, west right, 250° over 375 px', () => {
    expect(spanDeg()).toBe(250)
    expect(xOf(180)).toBe(187.5)
    expect(xOf(90)).toBeCloseTo(52.5)
    expect(xOf(270)).toBeCloseTo(322.5)
    expect(azimuthAt(0)).toBe(55)
    expect(azimuthAt(1)).toBe(305)
    expect(fractionOf(55)).toBe(0)
    expect(fractionOf(305)).toBe(1)
  })

  it('keeps the exact arithmetic of the formulas it replaced, in the stored (old mirrored) order and mirrored for the scene', () => {
    for (let az = 0; az < 360; az += 0.37) {
      expect(fractionOf(az, STORED_CAMERA)).toBe(((305 - az + 360) % 360) / 250)
      expect(lateral(az, STORED_CAMERA)).toBe(Math.sin((az * Math.PI) / 180))
      expect(toward(az, STORED_CAMERA) + 0).toBe(-Math.cos((az * Math.PI) / 180) + 0)
      expect(fractionOf(az)).toBe(((az - 55 + 360) % 360) / 250)
      expect(lateral(az) + 0).toBe(-Math.sin((az * Math.PI) / 180) + 0)
      expect(toward(az) + 0).toBe(-Math.cos((az * Math.PI) / 180) + 0)
    }
    for (let f = 0; f <= 1; f += 0.013) {
      expect(azimuthAt(f, STORED_CAMERA)).toBe(305 - 250 * f)
      expect(azimuthAt(f)).toBe(55 + 250 * f)
    }
  })

  it('puts the seam behind the view for the sky, at the left edge for the land', () => {
    expect(xOf(0.5)).toBeCloseTo(187.5 - 1.5 * 179.5)
    expect(xOf(359.5)).toBeCloseTo(187.5 + 1.5 * 179.5)
    expect(fractionOf(30)).toBeGreaterThan(1)
    expect(fractionOf(300)).toBeLessThan(1)
  })

  it('knows which side of the screen east and west are on', () => {
    expect(screenSide('east')).toBe('left')
    expect(screenSide('west')).toBe('right')
    expect(screenSide('east', STORED_CAMERA)).toBe('right')
    expect(screenSide('west', STORED_CAMERA)).toBe('left')
  })

  it('turns: a true camera facing north has east on the right and the sun behind', () => {
    const north: Camera = { ...SCENE_CAMERA, heading: 0, handed: 1 }
    expect(xOf(0, north)).toBe(187.5)
    expect(xOf(90, north)).toBeCloseTo(322.5)
    expect(lateral(90, north)).toBeCloseTo(1)
    expect(toward(180, north)).toBeCloseTo(-1)
    expect(azimuthAt(fractionOf(20, north), north)).toBeCloseTo(20)
    const southTrue: Camera = { ...SCENE_CAMERA, handed: 1 }
    expect(xOf(90, southTrue)).toBeCloseTo(52.5)
    expect(lateral(90, southTrue)).toBeCloseTo(-1)
  })
})

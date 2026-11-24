import { describe, expect, it } from 'vitest'
import { brightLimbAngle, moonLook, skyPoint } from './moonShape'
import { HORIZON_Y } from './sunPath'

describe('skyPoint', () => {
  it('puts due east over the Gilead and due west over Samaria, on the horizon', () => {
    expect(skyPoint(0, 90).x * 375).toBeCloseTo(52.5)
    expect(skyPoint(0, 270).x * 375).toBeCloseTo(322.5)
    expect(skyPoint(0, 180).x).toBeCloseTo(0.5)
    expect(skyPoint(0, 90).y).toBe(HORIZON_Y)
  })
  it('moves one way across the sky even when it rises north of east (no fold at due east or west)', () => {
    const xs = [60, 75, 90, 120, 180, 240, 270, 285, 300].map((az) => skyPoint(10, az).x)
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1])
    expect(xs[0] * 375).toBeGreaterThanOrEqual(0)
    expect(xs.at(-1)! * 375).toBeLessThanOrEqual(375)
  })
  it('rises with altitude', () => {
    expect(skyPoint(45, 180).y).toBeLessThan(skyPoint(10, 180).y)
  })
})

describe('brightLimbAngle', () => {
  it('turns the lit side towards the sun below the western ridge', () => {
    const moon = skyPoint(30, 160)
    const sunWest = skyPoint(-10, 250)
    const angle = brightLimbAngle(moon, sunWest)
    // West is on the right: the lit side faces right (and down, the sun being lower).
    expect(Math.abs(angle)).toBeLessThan(90)
  })
})

describe('moonLook', () => {
  const night = { altitude: 30, fraction: 0.6, sunAltitude: -20, cloudCover: 0, farFade: 0 }
  it('shows a clear night moon in full', () => {
    expect(moonLook(night)).toMatchObject({ opacity: 1, daylight: 0, ring: false })
  })
  it('hides below the ridges and under thick cloud', () => {
    expect(moonLook({ ...night, altitude: -5 })).toBeNull()
    expect(moonLook({ ...night, cloudCover: 100 })).toBeNull()
  })
  it('shines through a broken sky: cloud veils it only as the sky closes over', () => {
    expect(moonLook({ ...night, cloudCover: 30 })?.opacity).toBe(1)
    expect(moonLook({ ...night, cloudCover: 50 })!.opacity).toBeGreaterThan(0.9)
    expect(moonLook({ ...night, cloudCover: 70 })!.opacity).toBeCloseTo(0.5, 1)
    expect(moonLook({ ...night, cloudCover: 90 })!.opacity).toBeLessThan(0.2)
  })
  it('by day: plainly seen, the fuller the brighter; not as a thin crescent or under a closed sky', () => {
    expect(moonLook({ ...night, sunAltitude: 30 })!.opacity).toBeCloseTo(0.62, 2)
    expect(moonLook({ ...night, sunAltitude: 30, fraction: 1 })!.opacity).toBeCloseTo(0.8, 2)
    expect(moonLook({ ...night, sunAltitude: 30, fraction: 0.5 })!.opacity).toBeCloseTo(0.575, 2)
    expect(moonLook({ ...night, sunAltitude: 30, fraction: 0.1 })).toBeNull()
    expect(moonLook({ ...night, sunAltitude: 30, cloudCover: 90 })).toBeNull()
  })
  it('rings a thin crescent', () => {
    expect(moonLook({ ...night, fraction: 0.1 })?.ring).toBe(true)
  })
})

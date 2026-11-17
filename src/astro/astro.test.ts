import { describe, expect, it } from 'vitest'
import { moonEquatorial, moonIllumination } from './moon'
import { sunEquatorial, sunPosition } from './sun'
import { utcOf } from './utc'

const separation = (a: ReturnType<typeof sunEquatorial>, b: ReturnType<typeof moonEquatorial>) =>
  Math.acos(
    Math.sin(a.declination) * Math.sin(b.declination) +
    Math.cos(a.declination) * Math.cos(b.declination) *
      Math.cos(a.rightAscension - b.rightAscension),
  ) * 180 / Math.PI

describe('astronomy', () => {
  it('tracks the November 2026 lunar phases', () => {
    expect(moonIllumination(new Date('2026-11-24T14:53:00Z')).fraction).toBeGreaterThan(0.99)
    expect(moonIllumination(new Date('2026-11-09T07:02:00Z')).fraction).toBeLessThan(0.01)
    expect(moonIllumination(new Date('2026-11-17T12:00:00Z')).waxing).toBe(true)
    expect(moonIllumination(new Date('2026-11-28T12:00:00Z')).waxing).toBe(false)
  })

  it('places the sun and moon together at the solar eclipse', () => {
    // Gamma 0.898: the shadow axis passes far north of the Earth's centre, so seen from the centre the discs sit
    // about 0.9 × lunar parallax (≈ 0.85°) apart. Allow the model's ~0.3° error on top.
    const at = new Date('2026-08-12T17:46:00Z')
    expect(separation(sunEquatorial(at), moonEquatorial(at))).toBeLessThan(1.15)
  })

  it('places the moon at the antisolar point at the lunar eclipse', () => {
    const at = new Date('2026-03-03T11:33:00Z')
    expect(Math.abs(180 - separation(sunEquatorial(at), moonEquatorial(at)))).toBeLessThan(0.7)
  })

  it('matches Jerusalem solar noon and sunrise', () => {
    expect(sunPosition(new Date('2026-06-21T09:38:00Z'), 31.778, 35.235).altitude).toBeCloseTo(81.6, 0)
    // Sunrise (altitude −0.83°) falls between 06:00 and 06:20 local on 17 November.
    expect(sunPosition(utcOf('2026-11-17T06:00', 'Asia/Jerusalem'), 31.778, 35.235).altitude).toBeLessThan(-0.83)
    expect(sunPosition(utcOf('2026-11-17T06:20', 'Asia/Jerusalem'), 31.778, 35.235).altitude).toBeGreaterThan(-0.83)
  })

  it('converts Jerusalem wall time across daylight saving time', () => {
    expect(utcOf('2026-07-01T12:00', 'Asia/Jerusalem').toISOString()).toBe('2026-07-01T09:00:00.000Z')
    expect(utcOf('2026-12-01T12:00', 'Asia/Jerusalem').toISOString()).toBe('2026-12-01T10:00:00.000Z')
  })
})

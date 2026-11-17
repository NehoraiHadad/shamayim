import { describe, expect, it } from 'vitest'
import { noonElevation, sunAt, sunPosition } from './sunPath'

const LAT = 32.348

describe('sun path', () => {
  it('noon elevation is low in November and high in June', () => {
    expect(noonElevation('2026-11-17', LAT)).toBeCloseTo(38.6, 0)
    expect(noonElevation('2026-06-21', LAT)).toBeCloseTo(81.1, 0)
  })

  it('rises on the east (right) and sets on the west (left)', () => {
    expect(sunAt(0, '2026-11-17', LAT).x).toBeGreaterThan(0.8)
    expect(sunAt(1, '2026-11-17', LAT).x).toBeLessThan(0.2)
  })

  it('peaks at midday, higher in summer', () => {
    const winter = sunAt(0.5, '2026-11-17', LAT).y
    const summer = sunAt(0.5, '2026-06-21', LAT).y
    expect(winter).toBeLessThan(sunAt(0.1, '2026-11-17', LAT).y)
    expect(summer).toBeLessThan(winter)
  })

  it('is null before sunrise and after sunset', () => {
    const rise = '2026-11-17T06:08'
    const set = '2026-11-17T16:36'
    expect(sunPosition('2026-11-17T05:30', rise, set, LAT)).toBeNull()
    expect(sunPosition('2026-11-17T17:00', rise, set, LAT)).toBeNull()
    expect(sunPosition('2026-11-17T11:22', rise, set, LAT)?.t).toBeCloseTo(0.5, 1)
  })
})

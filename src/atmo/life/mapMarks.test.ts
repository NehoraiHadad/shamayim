import { describe, expect, it } from 'vitest'
import type { AirInput, AirState } from '../airTypes'
import { mapAir } from '../mapAir'
import { mapMarks } from './mapMarks'

const input: AirInput = {
  date: '2026-11-17', localHour: 12, humidity: 40, temperature: 24, feelsLike: 24,
  cloudCover: 0, windSpeed: 6, windGusts: 6, windDirection: 270, precipitation: 0,
  snowfall: 0, snowDepth: 0, visibilityKm: 40, pm10: 10, dust: 0, weatherCode: 0, sunElevation: 45, preview: false,
}
const life = (changes: Partial<AirInput>, airChanges: Partial<AirState> = {}) => {
  const value = { ...input, ...changes }
  return mapMarks(value, { ...mapAir(value), ...airChanges })
}

describe('mapMarks', () => {
  it('maps lights from night and storms', () => {
    expect(life({ sunElevation: -10, localHour: 21 }).litShare).toBe(1)
    expect(life({ sunElevation: -10, localHour: 3 }).litShare).toBe(.2)
    expect(life({ sunElevation: 30, weatherCode: 95 }).litShare).toBe(.3)
    expect(life({ sunElevation: 30 }).litShare).toBe(0)
  })

  it('maps lean, dry sway and turbine motion', () => {
    const dry = life({ windSpeed: 14, windGusts: 14, windDirection: 270 })
    expect(dry.leanDeg).toBeCloseTo(2.44, 2)
    expect(dry.sway?.ampDeg).toBeCloseTo(3.64, 2)
    expect(dry.sway?.periodS).toBeCloseTo(2.33, 2)
    const wet = life({ windSpeed: 14, windGusts: 14, windDirection: 270, precipitation: 1 })
    expect(wet.sway).toBeNull()
    expect(wet.leanDeg).toBeCloseTo(2.44, 2)
    expect(life({ windSpeed: 6 }).sway).toBeNull()
    const along = life({ windSpeed: 14, windGusts: 14, windDirection: 0 })
    expect(along.leanDeg).toBe(0)
    expect(along.sway?.ampDeg).toBeCloseTo(1.82, 2)
    const strong = life({ windSpeed: 30, windGusts: 30, windDirection: 270 })
    expect(strong.sway).toBeNull()
    expect(strong.turbinePeriodS).toBeCloseTo(5.34, 2)
  })

  it('hides far fog and stops motion during preview', () => {
    expect(life({}, { haze: { farFade: .9, nearFade: 0, amount: .9, color: '#fff' } }).hideFar).toBe(true)
    const preview = life({ windSpeed: 14, windGusts: 14, preview: true })
    expect(preview.sway).toBeNull()
    expect(preview.turbinePeriodS).toBeNull()
  })
})

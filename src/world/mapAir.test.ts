import { describe, expect, it } from 'vitest'
import type { AirInput } from '../atmo/airTypes'
import { mapAir } from './mapAir'
import { litShareOf } from './night'
import { visibilityKm, windU } from './airParts'

const calmDay: AirInput = {
  date: '2026-05-10', localHour: 12, humidity: 40,
  temperature: 22, feelsLike: 22, cloudCover: 0, windSpeed: 6, windGusts: 12, windDirection: 300,
  precipitation: 0, snowfall: 0, snowDepth: 0, visibilityKm: 30, pm10: 20, dust: null, weatherCode: 0,
  sunElevation: 40, preview: false,
}
const air = (over: Partial<AirInput>) => mapAir({ ...calmDay, ...over })

describe('mapAir', () => {
  it('a clear spring morning is a still picture', () => {
    const s = air({})
    expect(s.calm).toBe(true)
    expect(s.streaks.count + s.rain.count + s.grains.count).toBe(0)
  })

  it('wind direction maps to screen drift in the true view (a westerly moves left, an easterly right)', () => {
    expect(windU(270)).toBeCloseTo(-1)
    expect(windU(90)).toBeCloseTo(1)
    expect(Math.abs(windU(0))).toBeLessThan(1e-9)
  })

  it('dry 40 km/h easterly gives long left-to-right streaks', () => {
    const s = air({ windSpeed: 40, windGusts: 60, windDirection: 90 })
    expect(s.streaks.count).toBeGreaterThan(20)
    expect(s.wind.u).toBeGreaterThan(0)
    expect(s.wind.gustExcess).toBe(20)
    expect(s.calm).toBe(false)
  })

  it('wind along the valley foreshortens streaks', () => {
    const across = air({ windSpeed: 40, windDirection: 270 }).streaks.length
    const along = air({ windSpeed: 40, windDirection: 0 }).streaks.length
    expect(along).toBeCloseTo(across * 0.3)
  })

  it('drizzle and a downpour are clearly different', () => {
    const drizzle = air({ precipitation: 0.3, weatherCode: 53, cloudCover: 90 }).rain
    const pour = air({ precipitation: 25, weatherCode: 65, cloudCover: 100, windSpeed: 40, windDirection: 270 }).rain
    expect(drizzle.count).toBeLessThan(60)
    expect(pour.count).toBe(450)
    expect(pour.speed).toBeGreaterThan(drizzle.speed * 2)
    expect(Math.abs(pour.slant)).toBeGreaterThan(0.5)
    expect(Math.abs(drizzle.slant)).toBeLessThan(Math.abs(pour.slant))
  })

  it('a rain code with no measured rate still shows drizzle', () => {
    expect(air({ weatherCode: 61, precipitation: 0 }).rain.count).toBeGreaterThan(0)
  })

  it('rain makes wind streaks give way (one carrier per variable)', () => {
    const s = air({ precipitation: 3, weatherCode: 63, windSpeed: 40, windDirection: 270, cloudCover: 90 })
    expect(s.streaks.count).toBeLessThan(15)
  })

  it('heat shimmer needs sun and real heat', () => {
    expect(air({ temperature: 43 }).heat.band).toBeGreaterThan(30)
    expect(air({ temperature: 43, sunElevation: 5 }).heat.band).toBe(0)
    expect(air({ temperature: 33 }).heat.band).toBe(0)
    expect(air({ temperature: 33 }).heat.bloom).toBeGreaterThan(0)
  })

  it('a sharav hides the far ridge and makes the sun a coin', () => {
    const s = air({ pm10: 400, dust: 400, windSpeed: 25 })
    expect(visibilityKm({ ...calmDay, pm10: 400 })).toBeCloseTo(3.25)
    expect(s.haze.farFade).toBeGreaterThan(0.9)
    expect(s.sunCoin).toBeGreaterThan(0.9)
    expect(s.grains.count).toBeGreaterThan(60)
  })

  it('keeps at most two moving systems', () => {
    const s = air({ precipitation: 2, weatherCode: 63, pm10: 300, dust: 300, windSpeed: 45, temperature: 41, cloudCover: 50, sunElevation: 20 })
    const moving = [s.rain.count > 0, s.grains.count > 0, s.streaks.count > 0, s.heat.band > 0, s.rays.alpha > 0]
    expect(moving.filter(Boolean).length).toBeLessThanOrEqual(2)
    expect(s.rain.count).toBeGreaterThan(0)
  })

  it('cloud cover changes the amount of cloud, and overcast darkens', () => {
    expect(air({ cloudCover: 5 }).cloud.coverage).toBe(0)
    expect(air({ cloudCover: 50 }).cloud.coverage).toBeCloseTo(0.5)
    expect(air({ cloudCover: 95 }).cloud.darken).toBeCloseTo(0.1)
  })

  it('no lightning while previewing an hour', () => {
    expect(air({ weatherCode: 95 }).thunder).toBe(true)
    expect(air({ weatherCode: 95, preview: true }).thunder).toBe(false)
  })

  it('snow at freezing replaces rain', () => {
    const s = air({ snowfall: 1, precipitation: 1.5, temperature: 0, weatherCode: 73 })
    expect(s.snow.count).toBe(90)
    expect(s.rain.count).toBe(0)
  })
})

describe('lit windows', () => {
  const lit = (over: Partial<AirInput>) => litShareOf({ ...calmDay, ...over }, air(over))
  it('by the night\'s hour, and by day only under a storm', () => {
    expect(lit({ sunElevation: -10, localHour: 21 })).toBe(1)
    expect(lit({ sunElevation: -10, localHour: 3 })).toBe(.2)
    expect(lit({ sunElevation: 30, weatherCode: 95 })).toBe(.3)
    expect(lit({ sunElevation: 30 })).toBe(0)
  })
})

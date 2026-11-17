import { describe, expect, it } from 'vitest'
import { makeForecast, TODAY } from '../test/makeForecast'
import { airInput, sunElevation } from './airInput'

const SITE = { lat: 32.33, lon: 35.53, timezone: 'Asia/Jerusalem' }
// 14:00 dry and clear, 15:00 a downpour under full cloud: a moved time between them blends the two.
const forecast = makeForecast([{ max: 30, min: 20 }, {
  max: 30, min: 20,
  hour: (h) => (h === 15 ? { precipitation: 6, cloudCover: 100, weatherCode: 63, windSpeed: 40 } : {}),
}, { max: 30, min: 20 }])

describe('airInput at a moved minute', () => {
  it('interpolates the hourly fields between the hour and the next', () => {
    const at = airInput(forecast, `${TODAY}T09:00`, SITE, `${TODAY}T14:30`)
    expect(at.preview).toBe(true)
    expect(at.precipitation).toBeCloseTo(3)
    expect(at.cloudCover).toBeCloseTo(52.5)
    expect(at.windSpeed).toBeCloseTo(24)
    expect(at.localHour).toBeCloseTo(14.5)
  })
  it('takes the weather code from the nearer hour', () => {
    expect(airInput(forecast, `${TODAY}T09:00`, SITE, `${TODAY}T14:20`).weatherCode).toBe(0)
    expect(airInput(forecast, `${TODAY}T09:00`, SITE, `${TODAY}T14:40`).weatherCode).toBe(63)
  })
  it('is the live input when no time is moved', () => {
    expect(airInput(forecast, `${TODAY}T09:00`, SITE, null).preview).toBe(false)
  })
})

describe('sunElevation', () => {
  it('is the true altitude: high at a July noon, deep twilight before dawn, floored at full night', () => {
    expect(sunElevation(`${TODAY}T12:40`, SITE)).toBeGreaterThan(75)
    const dawn = sunElevation(`${TODAY}T05:20`, SITE)
    expect(dawn).toBeLessThan(0)
    expect(dawn).toBeGreaterThan(-8)
    expect(sunElevation(`${TODAY}T00:30`, SITE)).toBe(-18)
  })
})

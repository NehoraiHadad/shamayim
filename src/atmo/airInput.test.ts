import { describe, expect, it } from 'vitest'
import { utcOf } from '../astro/utc'
import { addMinutes } from '../domain/minutes'
import { rollForward } from '../domain/now'
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
  it('ages the real reading on both timelines after rolling the display into a new hour', () => {
    const observedAt = `${TODAY}T13:55`
    const at = `${TODAY}T14:05`
    const draft = {
      ...forecast,
      hours: forecast.hours.map((hour) => ({ ...hour, windDirection: 350, visibility: 30_000 })),
      current: { ...forecast.current, time: observedAt, windDirection: 10, visibility: 10_000, snowfall: 0.5 },
      fetchedAt: utcOf(observedAt, SITE.timezone).getTime(),
    }
    const rolled = rollForward(draft, at)
    expect(rolled.current.time).toBe(at)
    expect(rolled.observation).toBe(draft.current)
    expect(airInput(rolled, at, SITE, at)).toEqual({ ...airInput(draft, at, SITE, null), preview: true })
    expect(airInput(rolled, at, SITE, null)).toMatchObject({ windDirection: 10, visibilityKm: 10, snowfall: 2 })
    const fading = airInput(rolled, `${TODAY}T14:25`, SITE, null)
    expect(fading).toMatchObject({ windDirection: 0, visibilityKm: 20, snowfall: 1 })
    const expired = airInput(rolled, `${TODAY}T14:40`, SITE, null)
    expect(expired).toMatchObject({ windDirection: 350, visibilityKm: 30, snowfall: 0 })
  })
  it.each([[73, 4], [61, 2]])('keeps snow hourly as the current reading ages (code %s, %s °C)', (weatherCode, temperature) => {
    const time = TODAY + 'T13:00'
    const snowy = {
      ...forecast,
      current: { ...forecast.current, time, temperature: 1, weatherCode: 73, precipitation: 0.25, snowfall: 0.1 },
      hours: forecast.hours.map((hour) => ({ ...hour, temperature, weatherCode, precipitation: 2 })),
    }
    for (let minute = 0; minute <= 60; minute++) {
      const now = addMinutes(time, minute)
      const shown = airInput(rollForward(snowy, now), now, SITE, null)
      expect(shown.rainMmH).toBe(0)
      expect(shown.snowfall).toBeGreaterThan(0)
    }
    expect(airInput(snowy, TODAY + 'T14:00', SITE, null).snowfall).toBeCloseTo(1.4)
  })

  it('blends effects of weather codes and keeps warm rain showers liquid', () => {
    const dryStormSnow = makeForecast([{ max: 10, min: 10 }, {
      max: 10, min: 10,
      hour: (h) => ({ weatherCode: [95, 73, 80][h - 14] ?? 0, precipitation: h === 16 ? 1 : 0 }),
    }, { max: 10, min: 10 }])
    const sample = (minute: string) => airInput(dryStormSnow, TODAY + 'T08:00', SITE, TODAY + 'T' + minute)
    expect(sample('14:29')).toMatchObject({ weatherCode: 95 })
    expect(sample('14:31')).toMatchObject({ weatherCode: 73 })
    expect(sample('14:30')).toMatchObject({ thunderWeight: 0.5, fallingSnow: 0.275, rainMmH: 0.1, snowCloudRate: 0.05 })
    expect(sample('14:30').fieldWeather).toMatchObject({ convectiveStorm: 0.5, steadyRain: 0.5, fallMs: 1.25 })
    expect(sample('15:00')).toMatchObject({ fallingSnow: 0.55, rainMmH: 0, snowCloudRate: 0.1 })
    expect(sample('15:30')).toMatchObject({ fallingSnow: 0.275, rainMmH: 0.5, showerWeight: 0.5 })
    expect(sample('15:30').fieldWeather).toMatchObject({ convectiveShower: 0.5, steadyRain: 0.5, fallMs: 2.5 })
    expect(sample('16:00')).toMatchObject({ fallingSnow: 0, rainMmH: 1, showerWeight: 1 })
  })

  it('uses the available humidity and PM10 from either side of an interpolation', () => {
    const patchy = {
      ...forecast,
      hours: forecast.hours.map((hour) => ({ ...hour, humidity: hour.time === TODAY + 'T15:00' ? 80 : null })),
      air: [{ time: TODAY + 'T14:00', pm10: 64, dust: null, uv: null }],
    }
    const sample = (at: string) => airInput(patchy, TODAY + 'T08:00', SITE, TODAY + 'T' + at)
    expect(sample('14:01')).toMatchObject({ humidity: 80, pm10: 64 })
    expect(sample('14:59')).toMatchObject({ humidity: 80, pm10: 64 })
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

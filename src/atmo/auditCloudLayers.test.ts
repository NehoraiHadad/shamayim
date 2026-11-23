import { describe, expect, it } from 'vitest'
import { weatherAt } from './weatherAt'
import { utcOf } from '../astro/utc'
import type { CurrentWeather, Forecast } from '../domain/types'

const timezone = 'Asia/Jerusalem'
const time = '2026-11-23T13:30'
const atMs = utcOf(time, timezone).getTime()

const current: CurrentWeather = {
  time, temperature: 16, feelsLike: 16, isDay: true, weatherCode: 3, cloudCover: 90,
  windSpeed: 5, windGusts: 0, windDirection: 45, precipitation: 0, snowfall: 0, visibility: null, humidity: 70,
}
const makeForecast = (extra: Partial<Forecast> = {}): Forecast => ({
  placeId: 'audit', elevation: 0, current, hours: [], days: [], air: null, nowcast: null, normals: null,
  source: 'test', models: [], fetchedAt: atMs, ...extra,
})

describe('audited cloud layers', () => {
  it('keeps a live middle deck out of the low sky', () => {
    const forecast = makeForecast({ current: { ...current, thickCloud: 90, cloudLow: 0, cloudMid: 90, cloudHigh: 0 } })
    const weather = weatherAt(forecast, time, atMs, atMs, timezone)
    expect(weather.covers.low).toBeCloseTo(0)
    expect(weather.covers.mid).toBeCloseTo(0.9)
    expect(weather.mist.lowCloudPct).toBe(0)
    expect(weather.mist.blockingCloudPct).toBeCloseTo(90)
  })

  it('uses the thick-cloud split when the provider leaves a layer unknown', () => {
    const forecast = makeForecast({ current: { ...current, thickCloud: 90, cloudLow: 0, cloudMid: 90, cloudHigh: null } })
    const weather = weatherAt(forecast, time, atMs, atMs, timezone)
    const split = 1 - Math.sqrt(1 - 0.9)
    expect(weather.covers.low).toBeCloseTo(split)
    expect(weather.covers.mid).toBeCloseTo(split)
    expect(weather.mist.lowCloudPct).toBe(0)
    expect(weather.mist.blockingCloudPct).toBeCloseTo(90)
  })
})

import { expect, it } from 'vitest'
import { weatherAt } from './weatherAt'
import { utcOf } from '../astro/utc'
import { addMinutes } from '../domain/minutes'
import type { CurrentWeather, Forecast, HourPoint } from '../domain/types'

const timezone = 'Asia/Jerusalem'
const time = '2026-11-23T13:30'
const atMs = utcOf(time, timezone).getTime()

const current: CurrentWeather = {
  time, temperature: 16, feelsLike: 16, isDay: true, weatherCode: 3, cloudCover: 90,
  windSpeed: 5, windGusts: 0, windDirection: 45, precipitation: 0, snowfall: 0, visibility: null, humidity: 70,
}
const row = (values: Partial<HourPoint> & Pick<HourPoint, 'time'>): HourPoint => ({
  ...current, precipProb: null, snowDepth: 0, ...values,
})
const makeForecast = (extra: Partial<Forecast> = {}): Forecast => ({
  placeId: 'audit', elevation: 0, current, hours: [], days: [], air: null, nowcast: null, normals: null,
  source: 'test', models: [], fetchedAt: atMs, ...extra,
})

it('holds the air sample past the end of its coverage', () => {
  const hours = [
    row({ time: '2026-11-23T03:00', weatherCode: 0, cloudCover: 0 }),
    row({ time: '2026-11-24T03:00', weatherCode: 0, cloudCover: 0 }),
  ]
  const air = [{ time, pm10: 50, dust: 25, uv: 0 }]
  const forecast = makeForecast({ hours, air })
  for (const hour of hours) {
    const ms = utcOf(hour.time, timezone).getTime()
    expect(weatherAt(forecast, hour.time, ms, timezone))
      .toMatchObject({ pm10: 50, opticalPm10: 50, dust: 25, dustConcentration: 25 })
  }
})

it('keeps spring-gap and autumn-fold wall times in chronological order', () => {
  const iso = (stamp: string) => utcOf(stamp, timezone).toISOString()
  expect(iso('2026-03-27T02:30')).toBe('2026-03-27T00:00:00.000Z')
  expect(iso('2026-03-27T03:00')).toBe('2026-03-27T00:00:00.000Z')
  expect(iso('2026-10-25T00:59')).toBe('2026-10-24T21:59:00.000Z')
  expect(iso('2026-10-25T01:00')).toBe('2026-10-24T22:00:00.000Z')
  expect(iso('2026-10-25T02:00')).toBe('2026-10-25T00:00:00.000Z')
  for (const start of ['2026-03-27T01:00', '2026-10-25T00:00']) {
    for (let minute = 1; minute < 180; minute++) {
      expect(Date.parse(iso(addMinutes(start, minute))))
        .toBeGreaterThanOrEqual(Date.parse(iso(addMinutes(start, minute - 1))))
    }
  }
})

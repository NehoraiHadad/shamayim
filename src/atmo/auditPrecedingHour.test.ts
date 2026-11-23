import { expect, it } from 'vitest'
import { weatherAt } from './weatherAt'
import { wetBetween } from '../world/worldParts'
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

it('centres the preceding-hour sums across midnight and conserves the sampled total', () => {
  const hours = [
    { time: '2026-11-23T23:00', precipitation: 0, windGusts: 0 },
    { time: '2026-11-24T00:00', precipitation: 4, windGusts: 30 },
    { time: '2026-11-24T01:00', precipitation: 0, windGusts: 0 },
  ].map(sample => row({ ...sample, weatherCode: sample.precipitation ? 61 : 45,
    cloudCover: sample.precipitation ? 100 : 0 }))
  const forecast = makeForecast({ hours })
  const sample = (offset: number) => weatherAt(forecast, addMinutes(hours[1].time, offset), atMs + 10 * 3600_000, timezone)
  expect(sample(-30)).toMatchObject({ precipitation: 4, windGusts: 30 })
  expect(sample(-30).fieldWeather).toMatchObject({ steadyRain: 1, nimbostratus: 1 })
  expect(sample(-30).cloudCover).toBe(50)
  expect(sample(-30).mist.fogCodeWeight).toBe(0.5)
  expect(sample(0).precipitation).toBe(2)
  expect(wetBetween(hours, '2026-11-24T00:30', 0)).toBeCloseTo(0.75)
  const amount = Array.from({ length: 180 }, (_, minute) => sample(minute - 120).precipitation / 60)
    .reduce((sum, value) => sum + value, 0)
  expect(amount).toBeCloseTo(4)
})

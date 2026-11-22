import { describe, expect, it } from 'vitest'
import { correctCloudCover, observationWeight, withObservedCloud } from './observedCloud'
import type { Forecast } from './types'

const hour = (time: string, cloudCover: number, weatherCode = 0) =>
  ({ time, temperature: 15, precipProb: 0, precipitation: 0, weatherCode, cloudCover, windSpeed: 5, windGusts: 9, humidity: 60 })

const forecast = {
  current: { time: '2026-11-18T09:00', temperature: 15, feelsLike: 15, isDay: true, weatherCode: 0, cloudCover: 0,
    windSpeed: 5, windGusts: 9, windDirection: 270, precipitation: 0, snowfall: 0, visibility: null, humidity: 60 },
  hours: [hour('2026-11-18T09:00', 0), hour('2026-11-18T10:00', 0), hour('2026-11-18T12:00', 0), hour('2026-11-18T13:00', 0, 61)],
} as unknown as Forecast

describe('observationWeight', () => {
  it('trusts a fresh observation fully and a 100-minute-old one not at all', () => {
    expect(observationWeight({ cover: 30, at: '2026-11-18T08:35' }, '2026-11-18T09:00')).toBe(1)
    expect(observationWeight({ cover: 30, at: '2026-11-18T07:20' }, '2026-11-18T09:00')).toBe(0)
  })
  it('ignores an observation from a far-away time (a moved clock)', () => {
    expect(observationWeight({ cover: 30, at: '2026-11-18T09:00' }, '2026-11-17T09:00')).toBe(0)
  })
})

describe('withObservedCloud', () => {
  const seen = { cover: 30, at: '2026-11-18T08:35' }
  it('adds the clouds the satellite saw now and fades the correction over the next hours', () => {
    const out = withObservedCloud(forecast, seen, '2026-11-18T09:00')
    expect(out.current.cloudCover).toBe(30)
    expect(out.current.weatherCode).toBe(1)
    expect(out.hours[1].cloudCover).toBeCloseTo(18)
    expect(out.hours[2].cloudCover).toBe(0)
  })
  it('leaves rain codes alone and caps the shift', () => {
    const out = withObservedCloud(forecast, { cover: 100, at: '2026-11-18T08:35' }, '2026-11-18T09:00')
    expect(out.current.cloudCover).toBe(40)
    expect(out.hours[3].weatherCode).toBe(61)
  })
  it('eases from an outgoing satellite correction at the same minute', () => {
    const receivedAt = 1_000_000
    const now = '2026-11-18T09:00'
    const successor = { at: now, cover: 0, receivedAt, previous: seen }
    expect(withObservedCloud(forecast, successor, now, receivedAt)).toEqual(withObservedCloud(forecast, seen, now))
    expect(withObservedCloud(forecast, successor, now, receivedAt + 5 * 60_000).current.cloudCover).toBe(15)
    expect(withObservedCloud(forecast, successor, now, receivedAt + 10 * 60_000)).toBe(forecast)
  })
  it('keeps both hourly rows and scrubbed minutes before a sighting uncorrected', () => {
    const now = '2026-11-18T09:30'
    const seen = { at: '2026-11-18T09:15', cover: 30, receivedAt: 0 }
    expect(withObservedCloud(forecast, seen, now, 600_000).hours[0]).toBe(forecast.hours[0])
    expect(correctCloudCover(seen, now, '2026-11-18T09:14', 600_000, 0, 0)).toBe(0)
    expect(correctCloudCover(seen, now, seen.at, 300_000, 0, 0)).toBe(15)
    expect(correctCloudCover(seen, now, seen.at, 600_000, 0, 0)).toBe(30)
  })
  it('returns the forecast untouched without an observation', () => {
    expect(withObservedCloud(forecast, null, '2026-11-18T09:00')).toBe(forecast)
  })
})

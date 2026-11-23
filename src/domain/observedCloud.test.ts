import { describe, expect, it } from 'vitest'
import { makeForecast } from '../test/makeForecast'
import { rollForward } from './now'
import { correctCloudCover, observationWeight, withObservedCloud } from './observedCloud'
import type { Forecast, HourPoint } from './types'

const hour = (time: string, cloudCover: number, weatherCode = 0): HourPoint =>
  ({ time, temperature: 15, precipProb: 0, precipitation: 0, weatherCode, cloudCover, windSpeed: 5, windGusts: 9,
    humidity: 60, snowDepth: 0 })

const forecast: Forecast = {
  ...makeForecast([]),
  current: { time: '2026-11-18T09:00', temperature: 15, feelsLike: 15, isDay: true, weatherCode: 0, cloudCover: 0,
    windSpeed: 5, windGusts: 9, windDirection: 270, precipitation: 0, snowfall: 0, visibility: null, humidity: 60 },
  hours: [hour('2026-11-18T09:00', 0), hour('2026-11-18T10:00', 0), hour('2026-11-18T12:00', 0), hour('2026-11-18T13:00', 0, 61)],
}

describe('observationWeight', () => {
  it('trusts a fresh observation fully and a 100-minute-old one not at all', () => {
    expect(observationWeight({ cover: 30, at: '2026-11-18T08:35' }, '2026-11-18T09:00')).toBe(1)
    expect(observationWeight({ cover: 30, at: '2026-11-18T07:20' }, '2026-11-18T09:00')).toBe(0)
  })
  it('ignores an observation from a far-away time (a moved clock)', () => {
    expect(observationWeight({ cover: 30, at: '2026-11-18T09:00' }, '2026-11-17T09:00')).toBe(0)
  })
})

/** A morning clouding over from 20 to 60 in the hours, its provider's reading at 09:00. */
const rising = (reading: number): Forecast => ({ ...forecast, current: { ...forecast.current, cloudCover: reading },
  hours: [hour('2026-11-18T09:00', 20), hour('2026-11-18T10:00', 60)] })

describe('withObservedCloud', () => {
  it('keeps the card on the provider’s reading when the satellite agrees with it and the hours do not', () => {
    const out = withObservedCloud(rising(90), { cover: 90, at: '2026-11-18T09:05' }, '2026-11-18T09:10')
    expect(out.current.cloudCover).toBe(90)
  })
  it('gives the card back its own reading as the observation grows old, with no step at the end', () => {
    const model = rising(90), now = '2026-11-18T09:59'
    expect(withObservedCloud(model, { cover: 10, at: '2026-11-18T07:29' }, now).current).toBe(model.current)
    expect(withObservedCloud(model, { cover: 10, at: '2026-11-18T07:31' }, now).current.cloudCover).toBeGreaterThan(88)
  })
  const seen = { cover: 30, at: '2026-11-18T08:35' }
  it('adds the clouds the satellite saw now and fades the correction over the next hours', () => {
    const out = withObservedCloud(forecast, seen, '2026-11-18T09:00')
    expect(out.current.cloudCover).toBe(30)
    expect(out.current.weatherCode).toBe(1)
    // At 10:00 the observation is 85 minutes old: 30 points times (150 - 85) / (150 - 40).
    expect(out.hours[1].cloudCover).toBeCloseTo(30 * 65 / 110)
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
    const model = () => 0
    expect(correctCloudCover(seen, '2026-11-18T09:14', 600_000, 0, model)).toBe(0)
    expect(correctCloudCover(seen, seen.at, 300_000, 0, model)).toBe(15)
    expect(correctCloudCover(seen, seen.at, 600_000, 0, model)).toBe(30)
  })
  it('returns the forecast untouched without an observation', () => {
    expect(withObservedCloud(forecast, null, '2026-11-18T09:30')).toBe(forecast)
  })
  it('corrects the card and strip from the same interpolated timeline through the app rollover', () => {
    const model = rising(20)
    // The scene's model then: half way from the 09:00 reading of 20 to the hours' 40.
    const seen = { cover: 60, at: '2026-11-18T09:30' }
    const before = withObservedCloud(model, seen, '2026-11-18T09:59')
    const now = '2026-11-18T10:00'
    const after = withObservedCloud(rollForward(model, now), seen, now)
    // The satellite adds 60 - 30 = 30 points to both the viewed minute and the hour row.
    expect(before.current.cloudCover).toBeCloseTo(90 - 40 / 60)
    expect(after.current.cloudCover).toBe(90)
    expect(after.hours[1].cloudCover).toBe(after.current.cloudCover)
  })
  it('eases in the first observation without stepping the card at receipt or rollover', () => {
    const model = rising(20)
    const seen = { cover: 60, at: '2026-11-18T09:30', receivedAt: 0 }
    const receipt = '2026-11-18T09:55'
    expect(withObservedCloud(model, seen, receipt, 0).current.cloudCover).toBe(model.current.cloudCover)
    const rollover = '2026-11-18T10:00'
    expect(withObservedCloud(rollForward(model, rollover), seen, rollover, 5 * 60_000).current.cloudCover).toBe(75)
    const settled = '2026-11-18T10:05'
    expect(withObservedCloud(rollForward(model, settled), seen, settled, 10 * 60_000).current.cloudCover).toBe(90)
  })
})

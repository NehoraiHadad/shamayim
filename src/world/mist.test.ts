import { describe, expect, it } from 'vitest'
import { mistOf, nightMinimum, type MistInput } from './mist'

const BASE: MistInput = {
  humidity: 55,
  visibilityKm: 30,
  visibilitySource: 'current',
  dust: false,
  rainRateMmH: 0,
  lowCloudPct: 0,
  windMs: 1,
  sunAltitude: 45,
  temperature: 24,
  nightMinTemp: 16,
}

const mist = (over: Partial<MistInput>) => mistOf({ ...BASE, ...over })

describe('mistOf: radiation fog and burn-off', () => {
  it('forms on a calm, clear, damp night and burns off as the sun climbs and air warms', () => {
    const dampCalm: Partial<MistInput> = { humidity: 95, visibilityKm: 30, visibilitySource: 'current', windMs: 1 }
    const night = mist({ ...dampCalm, sunAltitude: -12, temperature: 14, nightMinTemp: 14 })
    const morning = mist({ ...dampCalm, sunAltitude: 8, temperature: 15.5, nightMinTemp: 14 })
    const midday = mist({ ...dampCalm, sunAltitude: 25, temperature: 19, nightMinTemp: 14 })

    expect(night.radiation).toBeGreaterThan(0.6)
    expect(night.persistent).toBe(0)
    expect(night.amount).toBe(night.radiation)

    expect(midday.radiation).toBeLessThan(0.05)
    expect(midday.amount).toBeLessThan(0.05)

    // Mid-morning partial burn-off sits strictly between night and midday.
    expect(morning.radiation).toBeGreaterThan(midday.radiation + 0.1)
    expect(morning.radiation).toBeLessThan(night.radiation - 0.1)
  })

  it('disperses radiation fog in a windy night', () => {
    const windy = mist({ humidity: 96, visibilityKm: 30, visibilitySource: 'current', windMs: 8, sunAltitude: -15, temperature: 13, nightMinTemp: 13 })
    expect(windy.radiation).toBeLessThan(0.01)
    expect(windy.amount).toBeLessThan(0.01)
  })
})

describe('mistOf: daytime persistence and exclusions', () => {
  it('persists at noon on low measured/forecast visibility, steady rain, or a damp marine layer', () => {
    const fog = mist({ visibilityKm: 2, visibilitySource: 'hour', humidity: 90 })
    expect(fog.persistent).toBeGreaterThan(0.6)
    expect(fog.amount).toBeGreaterThan(0.6)

    const rain = mist({ rainRateMmH: 3, humidity: 80 })
    expect(rain.persistent).toBeGreaterThan(0.4)
    expect(rain.amount).toBeGreaterThan(0.4)

    const marine = mist({ lowCloudPct: 90, humidity: 95 })
    expect(marine.persistent).toBeGreaterThan(0.5)
    expect(marine.amount).toBeGreaterThan(0.5)
  })

  it('gives zero mist on a dry noon, in dust, or from humidity-derived visibility alone', () => {
    expect(mist({ humidity: 55, visibilityKm: 30 })).toEqual({ radiation: 0, persistent: 0, amount: 0 })

    // Dust suppresses all mist even with low visibility, high humidity, rain and low cloud.
    expect(mist({ dust: true, visibilityKm: 1.5, visibilitySource: 'forced', humidity: 99, rainRateMmH: 4, lowCloudPct: 100, sunAltitude: -10 }))
      .toEqual({ radiation: 0, persistent: 0, amount: 0 })

    // Humidity-derived visibility never creates a fog term: neither persistent fog at noon nor nocturnal visibility fog.
    expect(mist({ visibilityKm: 2, visibilitySource: 'humidity', humidity: 95 }).persistent).toBe(0)
    expect(mist({ visibilityKm: 2, visibilitySource: 'humidity', humidity: 55, sunAltitude: -15, temperature: 14, nightMinTemp: 14 }).amount).toBe(0)
    expect(mist({ visibilityKm: 2, visibilitySource: 'default', humidity: 55, sunAltitude: -15, temperature: 14, nightMinTemp: 14 }).amount).toBe(0)
  })
})

describe('nightMinimum', () => {
  it('picks the lowest hourly temperature in the 12 h up to the shown time, across midnight', () => {
    const hours = [
      { time: '2026-11-16T15:00', temperature: 8 },  // 15 h before -> excluded
      { time: '2026-11-16T18:00', temperature: 19 }, // 12 h before -> included
      { time: '2026-11-16T22:00', temperature: 16 },
      { time: '2026-11-17T03:00', temperature: 12.5 },
      { time: '2026-11-17T06:00', temperature: 13 },
      { time: '2026-11-17T07:00', temperature: 9 },  // 1 h after -> excluded
    ]
    expect(nightMinimum(hours, '2026-11-17T06:00')).toBe(12.5)
    expect(nightMinimum([], '2026-11-17T06:00')).toBeNull()
    expect(nightMinimum([{ time: '2026-11-16T12:00', temperature: 10 }], '2026-11-17T06:00')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import type { AirInput } from '../atmo/airTypes'
import { airOf, chooseVisibility } from './air'
import { mistOf, nightMinimum, NO_MIST, type MistInput } from './mist'

const BASE: MistInput = {
  humidity: 55,
  visibilityKm: 30,
  visibilitySource: 'current',
  weatherCode: 0,
  dust: false,
  rainRateMmH: 0,
  lowCloudPct: 0,
  midCloudPct: 0,
  windMs: 1,
  sunAltitude: 45,
  sunRising: true,
  temperature: 24,
  nightMinTemp: 16,
}

const mist = (over: Partial<MistInput>) => mistOf({ ...BASE, ...over })

const AIR_BASE: AirInput = {
  date: '2026-11-17', localHour: 12, humidity: 40, temperature: 24, feelsLike: 24, cloudCover: 0,
  windSpeed: 6, windGusts: 10, windDirection: 270, precipitation: 0, snowfall: 0, snowDepth: 0,
  visibilityKm: 30, pm10: null, dust: null, weatherCode: 0, sunElevation: 40, preview: false,
}

describe('mistOf: radiation fog, burn-off and diurnal asymmetry', () => {
  it('forms on a calm clear damp night and burns off as morning sun climbs and air warms', () => {
    const damp: Partial<MistInput> = { humidity: 95, windMs: 1, sunRising: true }
    const night = mist({ ...damp, sunAltitude: -12, temperature: 14, nightMinTemp: 14 })
    const morning = mist({ ...damp, sunAltitude: 8, temperature: 15.5, nightMinTemp: 14 })
    const midday = mist({ ...damp, sunAltitude: 25, temperature: 19, nightMinTemp: 14 })
    expect(night.radiation).toBeGreaterThan(0.6)
    expect(night.persistent).toBe(0)
    expect(midday.radiation).toBeLessThan(0.05)
    expect(morning.radiation).toBeGreaterThan(midday.radiation + 0.1)
    expect(morning.radiation).toBeLessThan(night.radiation - 0.1)
  })

  it('varies with morning sun and warming independently', () => {
    const base: Partial<MistInput> = { humidity: 96, windMs: 1, sunRising: true }
    // Sun varies at zero warming.
    const lowSun = mist({ ...base, sunAltitude: 0, temperature: 14, nightMinTemp: 14 }).radiation
    const midSun = mist({ ...base, sunAltitude: 14, temperature: 14, nightMinTemp: 14 }).radiation
    const highSun = mist({ ...base, sunAltitude: 28, temperature: 14, nightMinTemp: 14 }).radiation
    expect(lowSun).toBeGreaterThan(0.7)
    expect(midSun).toBeGreaterThan(0.1)
    expect(midSun).toBeLessThan(lowSun - 0.2)
    expect(highSun).toBe(0)
    // Warming varies at pre-sunrise sun.
    const cool = mist({ ...base, sunAltitude: -2, temperature: 14, nightMinTemp: 14 }).radiation
    const warming = mist({ ...base, sunAltitude: -2, temperature: 16.5, nightMinTemp: 14 }).radiation
    const warm = mist({ ...base, sunAltitude: -2, temperature: 19, nightMinTemp: 14 }).radiation
    expect(cool).toBeGreaterThan(0.7)
    expect(warming).toBeGreaterThan(0.1)
    expect(warming).toBeLessThan(cool - 0.2)
    expect(warm).toBe(0)
  })

  it('stays zero in the afternoon with the sun up and ramps in through civil twilight (0° to −6°)', () => {
    const damp: Partial<MistInput> = { humidity: 96, windMs: 1, sunRising: false, temperature: 14, nightMinTemp: 14 }
    expect(mist({ ...damp, sunAltitude: 15 }).radiation).toBe(0)
    expect(mist({ ...damp, sunAltitude: 1 }).radiation).toBe(0)
    expect(mist({ ...damp, sunAltitude: 0 }).radiation).toBe(0)
    const twilight = mist({ ...damp, sunAltitude: -3 }).radiation
    const dark = mist({ ...damp, sunAltitude: -6 }).radiation
    expect(twilight).toBeGreaterThan(0.25)
    expect(twilight).toBeLessThan(dark - 0.2)
    expect(dark).toBeGreaterThan(0.7)
  })

  it('disperses in wind and is suppressed by overcast low or mid cloud', () => {
    const calmNight: Partial<MistInput> = { humidity: 96, windMs: 1, sunAltitude: -12, sunRising: true, temperature: 13, nightMinTemp: 13 }
    expect(mist({ ...calmNight, windMs: 8 }).radiation).toBeLessThan(0.01)
    const clear = mist(calmNight).radiation
    const lowOvercast = mist({ ...calmNight, lowCloudPct: 95 }).radiation
    const midOvercast = mist({ ...calmNight, midCloudPct: 95 }).radiation
    expect(lowOvercast).toBeCloseTo(clear * 0.1, 4)
    expect(midOvercast).toBeCloseTo(clear * 0.1, 4)
    // Pure high cloud does not block radiation (low=0, mid=0).
    expect(mist({ ...calmNight, lowCloudPct: 0, midCloudPct: 0 }).radiation).toBe(clear)
  })
})

describe('mistOf: persistent fog, droplets, rain, marine and exclusions', () => {
  it('persists on damp low visibility, fog codes 45/48 without visibility, damp rain, or raw low marine stratus', () => {
    expect(mist({ visibilityKm: 2, visibilitySource: 'hour', humidity: 90 }).persistent).toBeGreaterThan(0.6)
    expect(mist({ visibilityKm: 2, visibilitySource: 'hour', humidity: null }).persistent).toBeGreaterThan(0.6)
    // Dry reported low visibility lacks water droplets.
    expect(mist({ visibilityKm: 1.5, visibilitySource: 'hour', humidity: 50 })).toEqual(NO_MIST)
    // Fog weather codes 45/48 count as data fog (~0.8) when visibility is absent.
    expect(mist({ weatherCode: 45, visibilitySource: 'humidity', humidity: 92 }).persistent).toBeCloseTo(0.8, 4)
    expect(mist({ weatherCode: 48, visibilitySource: 'default', humidity: null }).persistent).toBeCloseTo(0.8, 4)
    expect(mist({ weatherCode: 45, visibilitySource: 'humidity', humidity: 50 }).persistent).toBe(0)
    // Rain needs damp surface air (no 0.45 floor in dry air).
    expect(mist({ rainRateMmH: 3, humidity: 90 }).persistent).toBeGreaterThan(0.8)
    expect(mist({ rainRateMmH: 3, humidity: 65 }).persistent).toBe(0)
    // Marine stratus uses raw low cloud.
    expect(mist({ lowCloudPct: 90, humidity: 95 }).persistent).toBeGreaterThan(0.5)
    expect(mist({ lowCloudPct: 1, midCloudPct: 95, humidity: 95 }).persistent).toBe(0)
  })

  it('gives zero mist on dry noon, in dust, in PM10 aerosol without dust, or from humidity visibility alone', () => {
    expect(mist({ humidity: 55, visibilityKm: 30 })).toEqual(NO_MIST)
    expect(mist({ dust: true, visibilityKm: 1.5, visibilitySource: 'forced', humidity: 99, rainRateMmH: 4, lowCloudPct: 100, sunAltitude: -10 }))
      .toEqual(NO_MIST)
    expect(mist({ visibilityKm: 2, visibilitySource: 'humidity', humidity: 95 }).persistent).toBe(0)
    // Aerosol PM10=400 at RH=40 caps air.visibilityKm, never creating mist (even with dust=0).
    const { air } = airOf({
      shown: { ...AIR_BASE, pm10: 400, dust: 0, humidity: 40, visibilityKm: 30 },
      preview: false, forcedVisibility: false,
      mist: { sun: { altitude: 45, azimuth: 170 }, windMs: 1 },
    })
    expect(air.visibilityKm).toBeCloseTo(3.25, 2)
    expect(air.mist).toEqual(NO_MIST)
  })
})

describe('chooseVisibility and nightMinimum continuity', () => {
  it('uses hour visibility in live mode when current visibility is null before falling back to humidity', () => {
    const shown = { ...AIR_BASE, visibilityKm: null, humidity: 85 }
    expect(chooseVisibility({ shown, hourVisibilityM: 12000, preview: false, forcedVisibility: false }))
      .toEqual({ km: 12, source: 'hour' })
    expect(chooseVisibility({ shown, hourVisibilityM: null, preview: false, forcedVisibility: false }).source)
      .toBe('humidity')
  })

  it('picks the 12 h minimum across midnight and stays continuous across the hh:00 -> hh:01 window edge', () => {
    const hours = [
      { time: '2026-11-16T15:00', temperature: 8 },
      { time: '2026-11-16T18:00', temperature: 19 },
      { time: '2026-11-16T22:00', temperature: 16 },
      { time: '2026-11-17T03:00', temperature: 12.5 },
      { time: '2026-11-17T06:00', temperature: 13 },
      { time: '2026-11-17T07:00', temperature: 9 },
    ]
    expect(nightMinimum(hours, '2026-11-17T06:00')).toBe(12.5)
    expect(nightMinimum([], '2026-11-17T06:00')).toBeNull()
    expect(nightMinimum([{ time: '2026-11-16T12:00', temperature: 10 }], '2026-11-17T06:00')).toBeNull()
    // Cold sample leaving the 12 h window at 06:00 -> 06:01 produces no step in nightMinimum or radiation mist.
    const edgeHours = [
      { time: '2026-11-16T18:00', temperature: 10 },
      { time: '2026-11-16T19:00', temperature: 14 },
      { time: '2026-11-17T06:00', temperature: 15 },
    ]
    const at00 = mist({ humidity: 96, sunAltitude: -5, temperature: 15, nightMinTemp: nightMinimum(edgeHours, '2026-11-17T06:00') })
    const at01 = mist({ humidity: 96, sunAltitude: -5, temperature: 15, nightMinTemp: nightMinimum(edgeHours, '2026-11-17T06:01') })
    expect(Math.abs(at00.radiation - at01.radiation)).toBeLessThan(0.05)
  })
})

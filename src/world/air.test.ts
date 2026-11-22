import { describe, expect, it } from 'vitest'
import type { AirInput } from '../atmo/airTypes'
import { airOf, chooseVisibility, type AirSourceInput } from './air'
import { NO_MIST } from './mist'

const AIR_BASE: AirInput = {
  date: '2026-11-17', localHour: 12, humidity: 40, temperature: 24, feelsLike: 24, cloudCover: 0,
  windSpeed: 6, windGusts: 10, windDirection: 270, precipitation: 0, snowfall: 0, snowDepth: 0,
  visibilityKm: 30, pm10: null, dust: null, weatherCode: 0, sunElevation: 40, preview: false,
}
const MIST_WEATHER: NonNullable<AirSourceInput['mist']>['weather'] = {
  humidityWeight: 1, weightedHumidity: 40, visibilityWeight: 1, weightedVisibilityKm: 30, fogCodeWeight: 0,
  lowCloudPct: 0, blockingCloudPct: 0, nightMinTemp: 24,
}

describe('chooseVisibility: shown timeline and fallbacks', () => {
  it.each([false, true])('uses forced, blended and fallback visibility for preview=%s', (preview) => {
    const shown = { ...AIR_BASE, visibilityKm: 8, humidity: 85, preview }
    expect(chooseVisibility({ shown: { ...shown, visibilityKm: 4 }, visibilitySource: 'hour', forcedVisibility: true }))
      .toEqual({ km: 4, source: 'forced' })
    expect(chooseVisibility({ shown, visibilitySource: 'hour', forcedVisibility: false }))
      .toEqual({ km: 8, source: 'hour' })
    expect(chooseVisibility({ shown: { ...shown, visibilityKm: 18 }, visibilitySource: 'current', forcedVisibility: false }))
      .toEqual({ km: 18, source: 'current' })
    expect(chooseVisibility({ shown: { ...shown, visibilityKm: null }, visibilitySource: 'hour', forcedVisibility: false }).source)
      .toBe('humidity')
    expect(chooseVisibility({ shown: { ...shown, visibilityKm: null, humidity: null }, visibilitySource: 'hour', forcedVisibility: false }))
      .toEqual({ km: 40, source: 'default' })
  })

  it('applies the fog-code fallback when the shown minute has no reported visibility', () => {
    const picked = (humidity: number | null) => airOf({
      shown: { ...AIR_BASE, visibilityKm: null, humidity, weatherCode: 45, preview: true },
      visibilitySource: humidity == null ? 'default' : 'humidity', forcedVisibility: false,
      mist: { sun: { altitude: 35, azimuth: 160 }, windMs: 2, weather: {
        ...MIST_WEATHER, humidityWeight: Number(humidity != null), weightedHumidity: humidity ?? 0,
        visibilityWeight: 0, weightedVisibilityKm: 0, fogCodeWeight: 1,
      } },
    })
    const unknownRh = picked(null)
    expect(unknownRh.source).toBe('default')
    expect(unknownRh.air.mist.fog).toBeCloseTo(0.8, 4)

    const dampRh = picked(92)
    expect(dampRh.source).toBe('humidity')
    expect(dampRh.air.mist.fog).toBeCloseTo(0.8, 4)
  })
})

describe('airOf: mist cloud overrides and uncapped aerosol visibility', () => {
  it('uses forced cloudCover as thick cover for mist when thickCloud is not forced (?wx=cloud:0)', () => {
    const nightMist = (forced: Partial<AirInput>, shownOver: Partial<AirInput> = {}) => airOf({
      shown: { ...AIR_BASE, humidity: 96, temperature: 14, cloudCover: 95, thickCloud: 95, ...shownOver, ...forced },
      visibilitySource: 'current', forcedVisibility: false,
      mist: {
        sun: { altitude: -12, azimuth: 80 }, windMs: 1,
        weather: { ...MIST_WEATHER, weightedHumidity: 96, lowCloudPct: 90, blockingCloudPct: 95, nightMinTemp: 14 },
        forced,
      },
    }).air.mist.radiation

    const forcedClear = nightMist({ cloudCover: 0 })
    const explicitClear = nightMist({ cloudCover: 0, thickCloud: 0 })
    expect(forcedClear).toBeGreaterThan(0.7)
    expect(forcedClear).toBeCloseTo(explicitClear, 6)
    expect(nightMist({ cloudCover: 95 }, { thickCloud: 0 })).toBeLessThan(0.12)
    expect(nightMist({ cloudCover: 90, thickCloud: 10 })).toBeGreaterThan(0.7)
  })

  it('keeps mist fog at zero under PM10 400 aerosol with reported 30 km visibility (both dry and RH 92)', () => {
    const dry = airOf({
      shown: { ...AIR_BASE, pm10: 400, dust: 0, humidity: 40, visibilityKm: 30 },
      visibilitySource: 'current', forcedVisibility: false,
      mist: { sun: { altitude: 45, azimuth: 170 }, windMs: 1, weather: MIST_WEATHER },
    }).air
    expect(dry.visibilityKm).toBeCloseTo(3.25, 2)
    expect(dry.mist).toEqual(NO_MIST)

    const damp = airOf({
      shown: { ...AIR_BASE, pm10: 400, dust: 0, humidity: 92, visibilityKm: 30 },
      visibilitySource: 'current', forcedVisibility: false,
      mist: { sun: { altitude: 45, azimuth: 170 }, windMs: 1, weather: { ...MIST_WEATHER, weightedHumidity: 92 } },
    }).air
    expect(damp.visibilityKm).toBeCloseTo(3.25, 2)
    expect(damp.mist.fog).toBe(0)
    expect(damp.mist.persistent).toBe(0)
  })
})

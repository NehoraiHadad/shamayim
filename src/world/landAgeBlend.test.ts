import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ageDaysBetween, blendLinearRgb, blendScalar, monthFromIsoDate,
  observationWeight, parseIsoDateMs, TAU_DAYS,
} from './landAgeBlend'

afterEach(() => { vi.useRealTimers() })

describe('landAgeBlend: age decay toward climatology across 0 d, 10 d, 45 d and 120 d', () => {
  it('decays each variable with its physical time constant across 0 d, 10 d, 45 d and 120 d', () => {
    const obsDate = '2026-11-15'
    // 0 days: 100% observation, pure source & date preserved
    expect(observationWeight('2026-11-15', obsDate, TAU_DAYS.albedo)).toBe(1)
    expect(observationWeight('2026-11-15', obsDate, TAU_DAYS.ndvi)).toBe(1)
    expect(observationWeight('2026-11-15', obsDate, TAU_DAYS.dryness)).toBe(1)
    expect(observationWeight('2026-11-15', obsDate, TAU_DAYS.snow)).toBe(1)

    // 10 days: albedo/NDVI mostly observed; dryness intermediate; snow already mostly climatology
    const wAlb10 = observationWeight('2026-11-25', obsDate, TAU_DAYS.albedo)
    const wNdvi10 = observationWeight('2026-11-25', obsDate, TAU_DAYS.ndvi)
    const wDry10 = observationWeight('2026-11-25', obsDate, TAU_DAYS.dryness)
    const wSnow10 = observationWeight('2026-11-25', obsDate, TAU_DAYS.snow)
    expect(wAlb10).toBeCloseTo(Math.exp(-10 / 30), 4)
    expect(wNdvi10).toBeCloseTo(Math.exp(-10 / 25), 4)
    expect(wDry10).toBeCloseTo(Math.exp(-10 / 10), 4)
    expect(wSnow10).toBeCloseTo(Math.exp(-10 / 5), 4)
    expect(wAlb10).toBeGreaterThan(wNdvi10)
    expect(wNdvi10).toBeGreaterThan(wDry10)
    expect(wDry10).toBeGreaterThan(wSnow10)

    // 45 days: albedo/NDVI weak residual observation; dryness & snow fully degraded to climatology (w = 0)
    expect(observationWeight('2026-12-30', obsDate, TAU_DAYS.albedo)).toBeCloseTo(Math.exp(-45 / 30), 4)
    expect(observationWeight('2026-12-30', obsDate, TAU_DAYS.ndvi)).toBeCloseTo(Math.exp(-45 / 25), 4)
    expect(observationWeight('2026-12-30', obsDate, TAU_DAYS.dryness)).toBe(0)
    expect(observationWeight('2026-12-30', obsDate, TAU_DAYS.snow)).toBe(0)

    // 120 days (full season away): all variables fully degrade to climatology
    expect(observationWeight('2027-03-15', obsDate, TAU_DAYS.albedo)).toBe(0)
    expect(observationWeight('2027-03-15', obsDate, TAU_DAYS.ndvi)).toBe(0)
    expect(observationWeight('2027-03-15', obsDate, TAU_DAYS.dryness)).toBe(0)
    expect(observationWeight('2027-03-15', obsDate, TAU_DAYS.snow)).toBe(0)
  })

  it('uses |age| symmetrically whether shownDate is in the future or past of the observation', () => {
    expect(ageDaysBetween('2026-11-25', '2026-11-15')).toBe(10)
    expect(ageDaysBetween('2026-11-05', '2026-11-15')).toBe(10)
    expect(observationWeight('2026-11-25', '2026-11-15', TAU_DAYS.ndvi))
      .toBe(observationWeight('2026-11-05', '2026-11-15', TAU_DAYS.ndvi))
  })

  it('carries source + date cleanly through pure, blended and expired states', () => {
    const obsDate = '2026-11-15'
    const pure = blendScalar(0.7, 0.2, 's2:2026-11-15', obsDate, '2026-11-15', TAU_DAYS.ndvi)
    expect(pure).toMatchObject({ value: 0.7, source: 's2:2026-11-15', date: obsDate, weight: 1 })

    const mixed = blendScalar(0.7, 0.2, 's2:2026-11-15', obsDate, '2026-11-25', TAU_DAYS.ndvi)
    expect(mixed.source).toBe('s2:2026-11-15+climatology')
    expect(mixed.date).toBe(obsDate)
    expect(mixed.value).toBeCloseTo(0.7 * mixed.weight + 0.2 * (1 - mixed.weight), 6)

    const expired = blendScalar(0.7, 0.2, 's2:2026-11-15', obsDate, '2027-03-15', TAU_DAYS.ndvi)
    expect(expired).toEqual({ value: 0.2, source: 'climatology', date: null, weight: 0 })

    // Linear RGB blend preserves :no-delight suffix when blended and drops it when expired
    const rgbMixed = blendLinearRgb([0.2, 0.1, 0.05], [0.1, 0.2, 0.15], 's2:2026-11-15:no-delight', obsDate, '2026-11-25')
    expect(rgbMixed.source).toBe('s2:2026-11-15:no-delight+climatology')
    expect(rgbMixed.date).toBe(obsDate)
    expect(rgbMixed.rgb[0]).toBeGreaterThan(0.1)
    expect(rgbMixed.rgb[0]).toBeLessThan(0.2)

    const rgbOld = blendLinearRgb([0.2, 0.1, 0.05], [0.1, 0.2, 0.15], 's2:2026-11-15:no-delight', obsDate, '2027-03-15')
    expect(rgbOld).toEqual({ rgb: [0.1, 0.2, 0.15], source: 'climatology', date: null, weight: 0 })
  })

  it('derives season month strictly from shownDate (never the system clock) and rejects invalid dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'))
    expect(monthFromIsoDate('2026-01-20')).toBe(1)
    expect(monthFromIsoDate('2026-11-17')).toBe(11)
    expect(parseIsoDateMs('2026-02-31')).toBeNull()
    expect(observationWeight('2026-11-15', '2026-02-31', TAU_DAYS.ndvi)).toBe(0)
    expect(observationWeight('2026-11-15', null, TAU_DAYS.ndvi)).toBe(0)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  blendLinearRgb, blendScalar, coverMeanWindow, formatWindowDate, modisNdviWindow, modisSrWindow,
  monthFromIsoDate, observationWeight, parseIsoDateMs, singleDayWindow, TAU_DAYS, windowAgeDays, windowWeight,
} from './landAgeBlend'

afterEach(() => { vi.useRealTimers() })

describe('landAgeBlend: causal as-of age decay, composite intervals and date validation', () => {
  it('decays each variable with its physical time constant across 0 d, 10 d, 45 d and 120 d', () => {
    const obsDate = '2026-11-15'
    expect(observationWeight('2026-11-15', obsDate, TAU_DAYS.albedo)).toBe(1)
    expect(observationWeight('2026-11-15', obsDate, TAU_DAYS.ndvi)).toBe(1)
    expect(observationWeight('2026-11-15', obsDate, TAU_DAYS.dryness)).toBe(1)
    expect(observationWeight('2026-11-15', obsDate, TAU_DAYS.snow)).toBe(1)

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

    expect(observationWeight('2026-12-30', obsDate, TAU_DAYS.albedo)).toBeCloseTo(Math.exp(-45 / 30), 4)
    expect(observationWeight('2026-12-30', obsDate, TAU_DAYS.ndvi)).toBeCloseTo(Math.exp(-45 / 25), 4)
    expect(observationWeight('2026-12-30', obsDate, TAU_DAYS.dryness)).toBe(0)
    expect(observationWeight('2026-12-30', obsDate, TAU_DAYS.snow)).toBe(0)

    expect(observationWeight('2027-03-15', obsDate, TAU_DAYS.albedo)).toBe(0)
    expect(observationWeight('2027-03-15', obsDate, TAU_DAYS.ndvi)).toBe(0)
    expect(observationWeight('2027-03-15', obsDate, TAU_DAYS.dryness)).toBe(0)
    expect(observationWeight('2027-03-15', obsDate, TAU_DAYS.snow)).toBe(0)
  })

  it('rejects future observations and incomplete multi-day composites in an as-of view', () => {
    // Single-day future observation: strictly ineligible (weight = 0)
    expect(observationWeight('2026-11-14', '2026-11-15', TAU_DAYS.albedo)).toBe(0)
    expect(observationWeight('2026-11-05', '2026-11-15', TAU_DAYS.ndvi)).toBe(0)
    const futureBlend = blendScalar(0.7, 0.2, 's2:2026-11-15', singleDayWindow('2026-11-15'), '2026-11-14', TAU_DAYS.ndvi)
    expect(futureBlend).toEqual({ value: 0.2, source: 'climatology', date: null, weight: 0 })

    // MOD09A1 8-day SR composite starting 2026-11-01 covers [2026-11-01, 2026-11-08]
    const srWin = modisSrWindow('2026-11-01')!
    expect(formatWindowDate(srWin)).toBe('2026-11-01/2026-11-08')
    expect(windowAgeDays('2026-11-05', srWin)).toBeNull() // mid-window: composite not complete yet
    expect(windowWeight('2026-11-07', srWin, TAU_DAYS.albedo)).toBe(0)
    expect(windowAgeDays('2026-11-08', srWin)).toBeCloseTo(3.5, 6) // midpoint age on completion day
    expect(windowWeight('2026-11-15', srWin, TAU_DAYS.albedo)).toBeCloseTo(Math.exp(-10.5 / 30), 4)

    // GIBS rolling 8-day NDVI ending 2026-11-18 covers [2026-11-11, 2026-11-18]
    const ndviWin = modisNdviWindow('2026-11-18')!
    expect(formatWindowDate(ndviWin)).toBe('2026-11-11/2026-11-18')
    expect(windowWeight('2026-11-17', ndviWin, TAU_DAYS.ndvi)).toBe(0)
    expect(windowAgeDays('2026-11-18', ndviWin)).toBeCloseTo(3.5, 6)

    // Mixed-date S2 cover mean [2026-10-20, 2026-11-15]: ineligible before newest, weighted from conservative oldest
    const meanWin = coverMeanWindow('2026-10-20', '2026-11-15')
    expect(windowWeight('2026-11-10', meanWin, TAU_DAYS.albedo)).toBe(0)
    expect(windowAgeDays('2026-11-15', meanWin)).toBe(26)
  })

  it('carries source + date/interval cleanly through pure, blended and expired states', () => {
    const win = singleDayWindow('2026-11-15')
    const pure = blendScalar(0.7, 0.2, 's2:2026-11-15', win, '2026-11-15', TAU_DAYS.ndvi)
    expect(pure).toMatchObject({ value: 0.7, source: 's2:2026-11-15', date: '2026-11-15', weight: 1 })

    const mixed = blendScalar(0.7, 0.2, 's2:2026-11-15', win, '2026-11-25', TAU_DAYS.ndvi)
    expect(mixed.source).toBe('s2:2026-11-15+climatology')
    expect(mixed.date).toBe('2026-11-15')
    expect(mixed.value).toBeCloseTo(0.7 * mixed.weight + 0.2 * (1 - mixed.weight), 6)

    const srMixed = blendLinearRgb([0.2, 0.1, 0.05], [0.1, 0.2, 0.15], 'gibs:2026-11-01', modisSrWindow('2026-11-01'), '2026-11-15')
    expect(srMixed.source).toBe('gibs:2026-11-01+climatology')
    expect(srMixed.date).toBe('2026-11-01/2026-11-08')

    const expired = blendLinearRgb([0.2, 0.1, 0.05], [0.1, 0.2, 0.15], 's2:2026-11-15', win, '2027-03-15')
    expect(expired).toEqual({ rgb: [0.1, 0.2, 0.15], source: 'climatology', date: null, weight: 0 })
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

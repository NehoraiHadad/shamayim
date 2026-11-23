import { describe, expect, it } from 'vitest'
import { DAILY_MAX_ADD, HOURLY_ADD } from './nationalTables'
import { dailyMaxAdd, hourlyTemperatureAdd, temperatureIconWeight } from './temperature'

describe('temperature correction', () => {
  it('weights ICON more in the first days only', () => {
    expect([-1, 0, 1, 2, 3, 4, 5, 6].map(temperatureIconWeight)).toEqual([0.8, 0.8, 0.8, 0.8, 0.6, 0.6, 0.4, 0.4])
  })

  it('adds the measured daily-max bias by lead, interpolating between measured leads', () => {
    expect(dailyMaxAdd(0)).toBe(DAILY_MAX_ADD[0])
    expect(dailyMaxAdd(1)).toBe(DAILY_MAX_ADD[1])
    expect(dailyMaxAdd(3)).toBeCloseTo((DAILY_MAX_ADD[2] + DAILY_MAX_ADD[3]) / 2)
    expect(dailyMaxAdd(9)).toBe(DAILY_MAX_ADD[4])
    expect(dailyMaxAdd(-1)).toBe(DAILY_MAX_ADD[0])
    // About a degree everywhere: the forecast daily maximum is too low.
    for (const add of DAILY_MAX_ADD) expect(add).toBeGreaterThan(0.5)
  })

  it('reads the table at the season centre, the standard-time hour and the lead', () => {
    // Mid-July (summer centre, day 196 in 2026: 15 July), 16:00 in summer time (UTC+3) = 15:00 standard time, 1 day ahead.
    const add = hourlyTemperatureAdd('2026-07-15T16:00', '2026-07-14T16:00', 10800)
    expect(add).toBeCloseTo(HOURLY_ADD[1][2][15], 6)
    // Mid-January, winter time (UTC+2), now: lead 0.
    expect(hourlyTemperatureAdd('2026-01-15T03:00', '2026-01-15T03:00', 7200)).toBeCloseTo(HOURLY_ADD[0][0][3], 6)
  })

  it('moves smoothly between seasons and between leads', () => {
    const now = '2026-02-01T00:00'
    const a = hourlyTemperatureAdd('2026-02-28T15:00', now, 7200)
    const b = hourlyTemperatureAdd('2026-03-01T15:00', now, 7200)
    expect(Math.abs(a - b)).toBeLessThan(0.05)
    const at = (h: number) => hourlyTemperatureAdd(`2026-03-0${1 + Math.floor(h / 24)}T${String(h % 24).padStart(2, '0')}:00`, '2026-03-01T00:00', 7200)
    expect(Math.abs(at(36) - at(12))).toBeLessThan(1)
  })

  it('lifts the afternoon, which the models forecast too cold', () => {
    const day = hourlyTemperatureAdd('2026-07-15T17:00', '2026-07-14T17:00', 10800)
    expect(day).toBeGreaterThan(0.5)
  })

  it('treats past hours as lead 0', () => {
    expect(hourlyTemperatureAdd('2026-01-15T01:00', '2026-01-15T03:00', 7200)).toBeCloseTo(HOURLY_ADD[0][0][1], 6)
  })
})

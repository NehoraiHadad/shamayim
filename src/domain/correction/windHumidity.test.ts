import { describe, expect, it } from 'vitest'
import { DAILY_GUST_SCALE, GUST_ADD, HUMIDITY_ADD } from './moreTables'
import { correctDailyGust, correctGust, correctHumidity, humidityIconWeight } from './windHumidity'

describe('gust and humidity correction', () => {
  it('reads the gust table at the season centre and standard-time hour', () => {
    // 15 July, 13:00 summer time = 12:00 standard time, forecast now (lead 0).
    expect(correctGust(30, 10, '2026-07-15T13:00', '2026-07-15T13:00', 10800)).toBeCloseTo(30 + GUST_ADD[0][2][12], 6)
  })

  it('never lowers a gust below the mean wind', () => {
    expect(correctGust(5, 12, '2026-07-15T03:00', '2026-07-15T03:00', 10800)).toBeGreaterThanOrEqual(12)
  })

  it('scales the daily maximum gust by lead, using day 1 beyond it', () => {
    expect(correctDailyGust(50, 0)).toBeCloseTo(50 * DAILY_GUST_SCALE[0], 6)
    expect(correctDailyGust(50, 5)).toBeCloseTo(50 * DAILY_GUST_SCALE[1], 6)
    for (const k of DAILY_GUST_SCALE) expect(k).toBeLessThan(1)
  })

  it('keeps humidity within 0–100', () => {
    expect(correctHumidity(99.5, '2026-01-15T03:00', '2026-01-14T03:00', 7200)).toBeLessThanOrEqual(100)
    expect(correctHumidity(0.2, '2026-07-15T13:00', '2026-07-14T13:00', 10800)).toBeGreaterThanOrEqual(0)
    expect(correctHumidity(50, '2026-01-15T03:00', '2026-01-14T03:00', 7200)).toBeCloseTo(50 + HUMIDITY_ADD[1][0][3], 6)
  })

  it('weights ICON more for humidity in the first days', () => {
    expect([0, 2, 3, 6].map(humidityIconWeight)).toEqual([0.8, 0.8, 0.6, 0.6])
  })
})

import { describe, expect, it } from 'vitest'
import type { CurrentWeather, HourPoint } from '../types'
import { applyLive, liveDecay } from './live'

const current = { time: '2026-11-23T07:30', temperature: 15, feelsLike: 14 } as CurrentWeather
const hour = (time: string, temperature: number) => ({ time, temperature }) as HourPoint
// 05:10 UTC = 07:10 Israel winter time.
const observedAt = Date.UTC(2026, 10, 23, 5, 10)

describe('live correction', () => {
  it('fades from the measured slope to nothing after 18 hours', () => {
    expect(liveDecay(0)).toBeCloseTo(0.87)
    expect(liveDecay(1)).toBeCloseTo(0.782)
    expect(liveDecay(18)).toBe(0)
    expect(liveDecay(40)).toBe(0)
    expect(liveDecay(-3)).toBe(0)
  })

  it('removes the anomaly from now and the coming hours, less as they get further', () => {
    const hours = [hour('2026-11-23T00:00', 10), hour('2026-11-23T08:00', 16), hour('2026-11-23T12:00', 20), hour('2026-11-24T12:00', 20)]
    const out = applyLive(current, hours, { anomaly: 1, observedAt }, 7200)
    // The forecast ran 1 °C warm: now (20 min after the reading) loses 0.84.
    expect(out.current.temperature).toBe(14.2)
    expect(out.current.feelsLike).toBe(13.2)
    expect(out.hours[0].temperature).toBe(10) // long before the reading
    expect(out.hours[1].temperature).toBeCloseTo(15.2, 1)
    expect(out.hours[2].temperature).toBeGreaterThan(19.3)
    expect(out.hours[3].temperature).toBe(20) // a day later: nothing left
    expect(hours[1].temperature).toBe(16) // input unchanged
  })

  it('changes nothing without an anomaly', () => {
    const hours = [hour('2026-11-23T08:00', 16)]
    expect(applyLive(current, hours, null, 7200)).toEqual({ current, hours })
  })
})

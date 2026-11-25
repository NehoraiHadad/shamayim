import { describe, expect, it } from 'vitest'
import { agoText, clockAt, clockIn, frameAge, frameIsStale, rainWithinThreeHours } from './timing'

describe('rain within three hours', () => {
  const now = '2026-11-18T23:15'
  const hours = (time: string, precipitation: number, precipProb: number | null = null) =>
    [{ time, precipitation, precipProb }]

  it('includes both boundaries and either rain threshold, across midnight', () => {
    expect(rainWithinThreeHours(hours(now, 0.1), now)).toBe(true)
    expect(rainWithinThreeHours(hours('2026-11-19T02:15', 0, 50), now)).toBe(true)
    expect(rainWithinThreeHours(hours('2026-11-19T01:00', 0.09, 49), now)).toBe(false)
  })

  it('excludes older hours and rain past the window', () => {
    expect(rainWithinThreeHours([
      ...hours('2026-11-18T23:00', 4),
      ...hours('2026-11-19T02:16', 4, 100),
    ], now)).toBe(false)
    expect(rainWithinThreeHours([], now)).toBe(false)
  })

  it('does not turn melted snow in the forecast into a rain alert', () => {
    const precipitation = { time: now, precipitation: 0.8, precipProb: 60 }
    expect(rainWithinThreeHours([{ ...precipitation, weatherCode: 73 }], now)).toBe(false)
    expect(rainWithinThreeHours([{ ...precipitation, weatherCode: 63 }], now)).toBe(true)
  })
})

describe('frame age', () => {
  const now = Date.UTC(2026, 10, 18, 12, 0)

  it('shows unavailable, current, and minute ages in Hebrew', () => {
    expect(frameAge(null, now)).toBe('—')
    expect(frameAge(now - 59_999, now)).toBe('עכשיו')
    expect(frameAge(now + 15_000, now)).toBe('עכשיו')
    expect(frameAge(now - 20 * 60_000, now)).toBe('לפני 20 דק׳')
  })

  it('marks frames stale only when older than 45 minutes', () => {
    expect(frameIsStale(null, now)).toBe(false)
    expect(frameIsStale(now - 45 * 60_000, now)).toBe(false)
    expect(frameIsStale(now - 45 * 60_000 - 1, now)).toBe(true)
  })
})

describe('clock in', () => {
  it('rounds to five minutes and crosses midnight', () => {
    expect(clockIn('2026-11-18T15:12', 28)).toBe('15:40')
    expect(clockIn('2026-11-18T23:50', 20)).toBe('00:10')
  })
})

describe('picture age in words', () => {
  it('rounds the way people say it, never "93 דק׳"', () => {
    expect([3, 7, 22, 58, 76, 93, 118].map((m) => agoText(m)))
      .toEqual(['עכשיו', 'לפני 5 דק׳', 'לפני 20 דק׳', 'לפני שעה', 'לפני שעה ורבע', 'לפני שעה וחצי', 'לפני שעתיים'])
    expect(agoText(52)).toBe('לפני 50 דק׳')
    expect(agoText(180)).toBe('לפני יותר משעתיים')
  })

  it('spells minutes out for screen readers', () => {
    expect(agoText(22, true)).toBe('לפני 20 דקות')
    expect(agoText(76, true)).toBe('לפני שעה ורבע')
  })

  it('gives the place’s clock for a frame', () => {
    expect(clockAt(Date.UTC(2026, 10, 18, 12, 40), 'Asia/Jerusalem')).toBe('14:40')
  })
})

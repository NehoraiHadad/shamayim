import { describe, expect, it } from 'vitest'
import { describeHour, SLOT_W, timeAtX, xAtTime } from './stripLayout'

describe('RTL strip time coordinates', () => {
  it('puts later hours to the left and round-trips minutes', () => {
    const first = '2026-11-17T10:00', width = 24 * SLOT_W
    expect(xAtTime('2026-11-17T11:00', first, width)).toBe(xAtTime(first, first, width) - SLOT_W)
    expect(timeAtX(xAtTime('2026-11-17T13:37', first, width), first, width)).toBe('2026-11-17T13:37')
  })
})

it('keeps the minus sign, digits and degree mark in one isolate in the hour description', () => {
  const description = describeHour({
    type: 'hour', time: '2026-11-17T05:00', temp: -3, kind: 'clear', isDay: false, prob: null, wind: 8, isNow: false,
  })
  expect(description).toBe('05:00, בהיר, \u2066−3°\u2069, רוח 8 קמ״ש')
})

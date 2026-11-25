import { describe, expect, it } from 'vitest'
import { makeForecast, TODAY } from '../../test/makeForecast'
import { describeHour, layoutStrip, SLOT_W, timeAtX, xAtTime } from './stripLayout'
import { buildTimeline } from './timeline'

describe('RTL strip time coordinates', () => {
  it('puts later hours to the left and round-trips minutes', () => {
    const first = '2026-11-17T10:00', width = 24 * SLOT_W
    expect(xAtTime('2026-11-17T11:00', first, width)).toBe(xAtTime(first, first, width) - SLOT_W)
    expect(timeAtX(xAtTime('2026-11-17T13:37', first, width), first, width)).toBe('2026-11-17T13:37')
  })

  it('positions sunrise between the right hours on a two-hour strip', () => {
    const forecast = makeForecast([{ max: 28, min: 18 }, { max: 30, min: 20 }])
    const slots = buildTimeline(forecast, `${TODAY}T00:00`, `${TODAY}T23:59`, `${TODAY}T00:00`, 2)
    const { pts, suns } = layoutStrip(slots)

    expect(suns[0].x).toBeCloseTo(pts[2].x - SLOT_W * 100 / 120)
  })
})

it('names a snowy hour and a chance of unclassified precipitation distinctly', () => {
  const slot = { type: 'hour' as const, time: `${TODAY}T05:00`, temp: -3, isDay: false, prob: 60, wind: 8, isNow: false }
  expect(describeHour({ ...slot, kind: 'snow' })).toContain('סיכוי לשלג \u206660%\u2069')
  expect(describeHour({ ...slot, kind: 'cloudy' })).toContain('סיכוי למשקעים \u206660%\u2069')
})

it('keeps the minus sign, digits and degree mark in one isolate in the hour description', () => {
  const description = describeHour({
    type: 'hour', time: '2026-11-17T05:00', temp: -3, kind: 'clear', isDay: false, prob: null, wind: 8, isNow: false,
  })
  expect(description).toBe('05:00, בהיר, \u2066−3°\u2069, רוח 8 קמ״ש')
})

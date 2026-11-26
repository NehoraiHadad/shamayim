import { describe, expect, it } from 'vitest'
import { makeForecast, TODAY } from '../../test/makeForecast'
import { buildTimeline, next24h } from './timeline'
import { fillGaps, smoothPath } from './curve'
import { layoutStrip } from './stripLayout'

const f = makeForecast([{ max: 30, min: 20 }, { max: 30, min: 20 }, { max: 31, min: 21 }, { max: 31, min: 21 }])

describe('next24h', () => {
  it('starts at the current hour, marked now, using current temperature', () => {
    const slots = next24h(f, `${TODAY}T09:20`)
    const first = slots[0]
    expect(first.type).toBe('hour')
    if (first.type === 'hour') {
      expect(first.time).toBe(`${TODAY}T09:00`)
      expect(first.isNow).toBe(true)
      expect(first.temp).toBe(f.current.temperature)
    }
    expect(slots.filter((s) => s.type === 'hour')).toHaveLength(25)
  })

  it('inserts sunset and the next sunrise in order', () => {
    const slots = next24h(f, `${TODAY}T09:20`)
    const sun = slots.filter((s) => s.type === 'sun')
    expect(sun.map((s) => s.time)).toEqual([`${TODAY}T19:45`, '2026-07-16T05:40'])
    const i = slots.findIndex((s) => s.type === 'sun')
    expect(slots[i - 1].time < slots[i].time && slots[i].time < slots[i + 1].time).toBe(true)
  })

  it('labels the calendar sunset, not the earlier time the sun goes behind the land', () => {
    const behind = { ...f, days: f.days.map((d, i) => i === 0 ? { ...d, visibleSunset: `${TODAY}T18:56` } : d) }
    const sun = next24h(behind, `${TODAY}T09:20`).filter((s) => s.type === 'sun')
    expect(sun.map((s) => s.time)).toEqual([`${TODAY}T19:45`, '2026-07-16T05:40'])
  })

  it('marks night hours', () => {
    const slots = next24h(f, `${TODAY}T09:20`)
    const at = (t: string) => slots.find((s) => s.type === 'hour' && s.time === t)
    expect(at(`${TODAY}T22:00`)).toMatchObject({ isDay: false })
    expect(at(`${TODAY}T12:00`)).toMatchObject({ isDay: true })
  })

  it('uses the displayed cover for dry icons even in a saved forecast with conflicting weather codes', () => {
    const saved = makeForecast([{ max: 30, min: 20 }, { max: 30, min: 20, hour: (h) => ({
      cloudCover: h === 11 ? 86 : 28,
      weatherCode: h === 12 ? 45 : h === 13 ? 61 : 2,
    }) }])
    saved.current.weatherCode = 2
    const hours = next24h(saved, `${TODAY}T09:20`).filter((slot) => slot.type === 'hour')
    expect(hours.slice(0, 5).map((hour) => hour.kind)).toEqual(['clear', 'clear', 'cloudy', 'fog', 'rain'])
  })

  it('excludes later days outside the 24-hour window when the saved hours have a gap', () => {
    const gap = { ...f, hours: f.hours.filter(h => h.time >= '2026-07-17T00:00') }
    expect(next24h(gap, `${TODAY}T09:20`)).toEqual([])
  })

  it('includes the last saved forecast hour when it is still in the window', () => {
    const hour = f.hours[40]
    const shortened = { ...f, hours: [hour] }
    expect(next24h(shortened, `${TODAY}T09:20`)).toMatchObject([{ time: hour.time }])
  })
})

describe('buildTimeline', () => {
  it('steps by two hours for a whole day', () => {
    const slots = buildTimeline(f, '2026-07-16T00:00', '2026-07-17T00:00', `${TODAY}T09:00`, 2)
    expect(slots.filter((s) => s.type === 'hour')).toHaveLength(12)
  })
})

describe('curve helpers', () => {
  it('fills gaps linearly', () => {
    expect(fillGaps([10, null, 20, null])).toEqual([10, 15, 20, 20])
  })
  it('draws a path through every point', () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 0 }]).match(/C/g)).toHaveLength(2)
  })
})

describe('layoutStrip', () => {
  const slots = next24h(f, `${TODAY}T09:20`)
  const layout = layoutStrip(slots)

  it('keeps sun events off the hour axis, between their neighbours', () => {
    expect(layout.hours).toHaveLength(25)
    const set = layout.suns[0]
    const i = layout.hours.findIndex((h) => h.time === `${TODAY}T19:00`)
    expect(set.x).toBeLessThan(layout.pts[i].x)
    expect(set.x).toBeGreaterThan(layout.pts[i + 1].x)
  })

  it('marks midnight with the next weekday name', () => {
    expect(layout.breaks).toHaveLength(1)
    expect(layout.breaks[0].label).not.toMatch(/^יום/)
  })
})

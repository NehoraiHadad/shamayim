import { describe, expect, it } from 'vitest'
import { utcOf } from '../astro/utc'
import type { Place } from '../config/place'
import type { HourPoint } from '../domain/types'
import { openSky, PLACE } from '../test/eventForecast'
import { HALO_DEG, separation } from '../world/optics'
import { haloChance } from './haloChance'
import { eventsOf } from './index'
import { milkyWayWindow } from './milkyWayWindow'
import { thinEveningCrescent } from './thinEveningCrescent'

const RAMON: Place = { ...PLACE, id: 'ramon-crater', nameHe: 'מכתש רמון', lat: 30.585, lon: 34.81, population: 0 }
const clearAir = () => ({ visibility: 40_000 })
const iceCloud: Partial<HourPoint> = {
  visibility: 40_000, cloudCover: 80, cloudLow: 0, cloudMid: 0, cloudHigh: 80,
  cruise: { temperature: -52, humidity: 70 },
}

describe('thin evening crescent', () => {
  it('offers the young Moon low in the southwest after sunset on a good January evening', () => {
    const sky = openSky('2026-01-20T12:00', clearAir, RAMON)
    const [event] = eventsOf(sky, [thinEveningCrescent])
    expect(event).toMatchObject({ what: 'סהר ירח דק', viewing: 'expected',
      when: { from: '2026-01-20T17:35', to: '2026-01-20T18:00', tell: 'span' } })
    expect(event.where.azimuth).toBeCloseTo(242.2, 0)
    expect(event.where.altitude).toBeGreaterThan(8)
  })

  it('skips the younger, low twilight Moon the previous evening and the already past event the next morning', () => {
    expect(eventsOf(openSky('2026-01-19T12:00', clearAir, RAMON), [thinEveningCrescent])).toEqual([])
    expect(eventsOf(openSky('2026-01-21T04:00', clearAir, RAMON), [thinEveningCrescent])).toEqual([])
  })

  it('skips a promising crescent when a ridge, cloud, or haze hides it', () => {
    const when = '2026-01-20T12:00'
    const sky = openSky(when, clearAir, RAMON)
    expect(eventsOf({ ...sky, clear: ({ altitude }) => altitude > 20 }, [thinEveningCrescent])).toEqual([])
    expect(eventsOf(openSky(when, () => ({ ...clearAir(), cloudCover: 50 }), RAMON), [thinEveningCrescent])).toEqual([])
    expect(eventsOf(openSky(when, () => ({ visibility: 7000 }), RAMON), [thinEveningCrescent])).toEqual([])
  })
})

describe('good Milky Way window', () => {
  it('finds a long, early window toward the bright inner band from a dark desert site', () => {
    const [event] = eventsOf(openSky('2026-08-12T12:00', clearAir, RAMON), [milkyWayWindow])
    expect(event).toMatchObject({ what: 'שביל החלב הבהיר', viewing: 'expected',
      when: { from: '2026-08-12T21:00', to: '2026-08-12T23:15', tell: 'span' } })
    expect(event.where.azimuth).toBeCloseTo(176.5, 0)
    expect(event.where.altitude).toBeGreaterThan(30)
  })

  it('skips a city, an obstructed view, a short gap in the clouds, and a hazy sky', () => {
    const when = '2026-08-12T12:00'
    const sky = openSky(when, clearAir, RAMON)
    const singleClearHour = (h: number) => ({ ...clearAir(), cloudCover: h === 21 ? 0 : 80 })
    expect(eventsOf({ ...sky, glow: 3 }, [milkyWayWindow])).toEqual([])
    expect(eventsOf({ ...sky, clear: () => false }, [milkyWayWindow])).toEqual([])
    expect(eventsOf(openSky(when, singleClearHour, RAMON), [milkyWayWindow])).toEqual([])
    expect(eventsOf(openSky(when, () => ({ visibility: 12_000 }), RAMON), [milkyWayWindow])).toEqual([])
  })

  it('skips a night with a bright Moon and a season when the inner band rises too late', () => {
    expect(eventsOf(openSky('2026-08-28T12:00', clearAir, RAMON), [milkyWayWindow])).toEqual([])
    expect(eventsOf(openSky('2026-04-16T12:00', clearAir, RAMON), [milkyWayWindow])).toEqual([])
  })
})

describe('halo opportunities', () => {
  it('marks a solar halo as weather-dependent and points toward the upper arc', () => {
    const sky = openSky('2026-11-24T09:00', (h) => h >= 11 && h <= 13 ? iceCloud : clearAir(), RAMON)
    const [event] = eventsOf(sky, [haloChance])
    expect(event).toMatchObject({ what: 'תיתכן הילה סביב השמש', kind: 'solar-halo', viewing: 'weather-dependent',
      when: { from: '2026-11-24T10:30', to: '2026-11-24T13:15', tell: 'span' } })
    const sun = sky.sunAt(utcOf(event.when.from, RAMON.timezone).getTime())
    expect(event.where.altitude).toBeGreaterThan(sun.altitude)
    expect(separation(event.where, sun)).toBeCloseTo(HALO_DEG)
  })

  it.each([
    { cruise: null }, { cruise: { temperature: -52, humidity: 20 } }, { cruise: { temperature: -25, humidity: 90 } },
    { cloudCover: 90, cloudMid: 50 }, { cloudHigh: null }, { weatherCode: 45 }, { visibility: null },
  ])('skips the solar chance with weak or obstructed ice-cloud evidence (%j)', (change) => {
    const sky = openSky('2026-11-24T09:00', () => ({ ...iceCloud, ...change }), RAMON)
    expect(eventsOf(sky, [haloChance])).toEqual([])
  })

  it('requires a sustained forecast window', () => {
    const sky = openSky('2026-11-24T09:00', (h) => h === 11 ? iceCloud : clearAir(), RAMON)
    expect(eventsOf(sky, [haloChance])).toEqual([])
  })

  it('only offers a lunar halo in darkness with a bright Moon high enough to light the clouds', () => {
    const sky = openSky('2026-11-24T18:30', () => iceCloud, RAMON)
    const [event] = eventsOf(sky, [haloChance])
    expect(event).toMatchObject({ what: 'תיתכן הילה סביב הירח', viewing: 'weather-dependent' })
    const moon = sky.moonAt(utcOf(event.when.from, RAMON.timezone).getTime())
    expect(separation(event.where, moon)).toBeCloseTo(HALO_DEG)
    expect(eventsOf(openSky('2026-08-12T20:00', () => iceCloud, RAMON), [haloChance])).toEqual([])
  })
})

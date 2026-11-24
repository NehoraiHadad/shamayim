import { describe, expect, it } from 'vitest'
import { addMinutes } from '../domain/minutes'
import { eventsOf, eventSky, specialEvent } from '.'
import { unknownLand } from '../data/terrain/terrain'
import { eventForecast, openSky, PLACE } from '../test/eventForecast'
import type { Candidate, EventSky } from './types'

const kinds = (sky: EventSky) => eventsOf(sky).map((e) => e.what)
const clouds = (cloudCover: number) => () => ({ cloudCover, thickCloud: cloudCover })
const showers = { precipitation: 1, precipProb: 70, weatherCode: 81, cloudCover: 45, thickCloud: 45, cloudLow: 45, cloudMid: 0, cloudHigh: 0 }

describe('the special event of a place', () => {
  it('is none on most days, under a clear sky all year', () => {
    const told = Array.from({ length: 365 }, (_, d) => specialEvent(openSky(addMinutes('2027-01-01T12:00', 1440 * d)))).filter(Boolean)
    expect(told.length).toBeGreaterThan(15)
    expect(told.length).toBeLessThan(45)
  })

  it('tells the full moon rising near sunset, on its one evening', () => {
    expect(kinds(openSky('2026-11-24T12:00'))).toEqual(['ירח מלא זורח'])
    expect(kinds(openSky('2026-11-23T12:00'))).toEqual([])
    expect(kinds(openSky('2026-11-25T12:00'))).toEqual([])
    const [event] = eventsOf(openSky('2026-11-24T12:00'))
    expect(event.when.tell).toBe('at')
    expect(event.when.from >= '2026-11-24T16:15' && event.when.from <= '2026-11-24T16:30').toBe(true)
    expect(event.where.azimuth).toBeGreaterThan(55)
    expect(event.where.azimuth).toBeLessThan(70)
  })

  it('drops what is past, what the clouds hide and what stands behind the land', () => {
    expect(kinds(openSky('2026-11-24T19:00'))).toEqual([])
    expect(kinds(openSky('2026-11-24T12:00', clouds(90)))).toEqual([])
    const sky = openSky('2026-11-24T12:00')
    expect(kinds({ ...sky, clear: ({ altitude }) => altitude > 12 })).toEqual([])
    const [late] = eventsOf({ ...sky, clear: ({ altitude }) => altitude > 5 })
    expect(late.when.from > '2026-11-24T16:40').toBe(true)
  })

  it('promises nothing while the land is on its way or past the forecast', () => {
    const forecast = eventForecast('2026-11-24')
    expect(eventSky(PLACE, forecast, '2026-11-24T12:00', unknownLand('loading'))).toBeNull()
    expect(eventSky(PLACE, forecast, '2026-12-24T12:00', unknownLand('offline'))).toBeNull()
    expect(kinds(eventSky(PLACE, { ...forecast, hours: [] }, '2026-11-24T12:00', unknownLand('offline'))!)).toEqual([])
  })

  it('tells a shower on the night of its peak, also after midnight, under a sky dark enough', () => {
    expect(kinds(openSky('2026-12-14T12:00'))).toEqual(['מטר מטאורים: גמינידים'])
    expect(kinds(openSky('2026-12-15T00:30'))).toEqual(['מטר מטאורים: גמינידים'])
    expect(kinds(openSky('2026-12-15T12:00'))).toEqual([])
    expect(kinds(openSky('2026-12-14T12:00', undefined, { ...PLACE, population: 2_000_000 }))).toEqual(['מטר מטאורים: גמינידים'])
    expect(kinds({ ...openSky('2026-12-14T12:00'), glow: 1000 })).toEqual([])
    // Some 15 an hour at the best (the Leonids): not worth going out for.
    expect(kinds(openSky('2026-11-17T12:00'))).toEqual([])
  })

  it('tells a bright planet beside the moon', () => {
    const [event] = eventsOf(openSky('2026-12-27T12:00'))
    expect(event).toMatchObject({ what: 'צדק ליד הירח', when: { tell: 'from' } })
    expect(kinds(openSky('2026-12-25T12:00'))).toEqual([])
  })

  it('words a rainbow as a chance, with showers and a low sun, opposite the sun', () => {
    const [event] = eventsOf(openSky('2026-11-18T09:00', (hour) => (hour >= 14 && hour <= 16 ? showers : {})))
    expect(event).toMatchObject({ what: 'תיתכן קשת בענן', when: { tell: 'span' } })
    expect(event.when.from >= '2026-11-18T13:30' && event.when.to <= '2026-11-18T16:40').toBe(true)
    expect(event.where.azimuth).toBeGreaterThan(20)
    expect(event.where.azimuth).toBeLessThan(80)
    for (const weather of [{ ...showers, cloudLow: 100, cloudCover: 100, thickCloud: 100 }, { ...showers, precipitation: 0 },
      { ...showers, precipProb: 20 }]) expect(kinds(openSky('2026-11-18T09:00', () => weather))).not.toContain('תיתכן קשת בענן')
    // No bow at noon in summer: the sun stands over 42°.
    expect(kinds(openSky('2027-06-25T09:00', (hour) => (hour >= 10 && hour <= 14 ? showers : {})))).toEqual([])
  })

  it('takes any detector and tells the rarest first', () => {
    const at = (what: string, perYear: number) => (sky: EventSky): Candidate[] => [{ what, perYear, tell: 'at', from: sky.from, to: sky.to,
      at: () => ({ azimuth: 90, altitude: 30 }) }]
    expect(eventsOf(openSky('2026-11-18T09:00'), [at('b', 5), at('a', 0.1), at('c', 9)]).map((e) => e.what)).toEqual(['a', 'b', 'c'])
  })
})

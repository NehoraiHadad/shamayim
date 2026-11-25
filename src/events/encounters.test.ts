import { describe, expect, it } from 'vitest'
import { openSky, PLACE } from '../test/eventForecast'
import { eventsOf } from './index'
import { lunarOccultation } from './lunarOccultation'
import { moonByStar } from './moonByStar'
import { planetPair } from './planetPair'

const MINUTE = 60_000
const opaque = () => ({ cloudCover: 100, thickCloud: 100 })
const JERUSALEM = { ...PLACE, id: 'jerusalem', lat: 31.7683, lon: 35.2137, elevation: 750 }
const DUBLIN = { ...PLACE, id: 'dublin', lat: 53.3498, lon: -6.2603, timezone: 'Europe/Dublin' }
const CHICAGO = { ...PLACE, id: 'chicago', lat: 41.8781, lon: -87.6298, timezone: 'America/Chicago' }

describe('naked-eye encounters', () => {
  it('finds the crescent near the Pleiades before dawn, with enough contrast to see the cluster', () => {
    // RASC Observer’s Handbook: https://occultations.org/publications/rasc/2026/lunar26.pdf, Aug. 6/7 passage.
    const sky = openSky('2026-08-06T12:00')
    const [event] = eventsOf(sky, [moonByStar])
    expect(event).toMatchObject({ what: 'צביר הכימה ליד הירח', when: { tell: 'from' }, viewing: 'expected' })
    expect(event.when.from >= '2026-08-07T03:00' && event.when.from <= '2026-08-07T04:30').toBe(true)
    expect(eventsOf({ ...sky, glow: 1000 }, [moonByStar])).toEqual([])
    expect(eventsOf(openSky('2026-08-06T12:00', opaque), [moonByStar])).toEqual([])
    // The 2026 November passage coincided with the full Moon.
    expect(eventsOf(openSky('2026-11-24T12:00'), [moonByStar]).map((e) => e.what)).not.toContain('צביר הכימה ליד הירח')
  })

  it('finds a bright named star beside the Moon before they meet', () => {
    const [event] = eventsOf(openSky('2026-03-29T12:00'), [moonByStar])
    expect(event).toMatchObject({ what: 'רגולוס ליד הירח', when: { tell: 'from' } })
    expect(event.when.from < '2026-03-29T22:10').toBe(true)
  })

  it('finds Venus and Jupiter together to the west on their closest night', () => {
    // NASA APOD, June 12: https://science.nasa.gov/image-article/apod-2026-june-12-venus-and-jupiter-conjunction-from-avebury/.
    const sky = openSky('2026-06-09T12:00')
    const [event] = eventsOf(sky, [planetPair])
    expect(event).toMatchObject({ what: 'נוגה וצדק קרובים בשמיים', when: { tell: 'from' } })
    expect(event.where.azimuth).toBeGreaterThan(250)
    expect(event.where.azimuth).toBeLessThan(310)
    expect(eventsOf({ ...sky, clear: () => false }, [planetPair])).toEqual([])
    expect(eventsOf(openSky('2026-06-08T12:00'), [planetPair])).toEqual([])
    expect(eventsOf(openSky('2026-06-10T12:00'), [planetPair])).toEqual([])
  })

  it('finds the Great Conjunction of Jupiter and Saturn low in the southwest after dusk', () => {
    // NASA December 2020 guide: https://science.nasa.gov/resource/whats-up-december-2020-video/.
    const [event] = eventsOf(openSky('2020-12-21T12:00'), [planetPair])
    expect(event).toMatchObject({ what: 'צדק ושבתאי קרובים בשמיים', when: { tell: 'from' } })
    expect(event.where.altitude).toBeGreaterThan(7)
    expect(event.where.altitude).toBeLessThan(20)
  })

  it('uses local travel across the dark limb for the precise night of the Regulus disappearance', () => {
    // DE440 contact in Jerusalem at 22:12 local: https://theskylive.com/lunar-occultations/2026-03-29-regulus.
    const sky = openSky('2026-03-29T12:00', undefined, JERUSALEM)
    const [candidate] = lunarOccultation(sky)
    const [event] = eventsOf(sky, [lunarOccultation])
    expect(event).toMatchObject({ what: 'הירח מסתיר את רגולוס', approximateTime: true, when: { tell: 'at' } })
    expect(Math.abs(candidate.from - Date.parse('2026-03-29T19:12Z'))).toBeLessThan(2 * MINUTE)
    expect(event.where.altitude).toBeCloseTo(70, 0)
    expect(eventsOf(openSky('2026-03-29T12:00', undefined, DUBLIN), [lunarOccultation])).toEqual([])
    expect(eventsOf(openSky('2026-03-29T22:15', undefined, JERUSALEM), [lunarOccultation])).toEqual([])
    expect(eventsOf(openSky('2026-03-29T12:00', opaque, JERUSALEM), [lunarOccultation])).toEqual([])
  })

  it('finds the dark-limb return of Jupiter over Chicago before dawn', () => {
    // IOTA contact in Chicago at 09:17:23 UT: https://www.lunar-occultations.com/iota/bstar/1006jupiter.htm.
    const sky = openSky('2026-10-05T12:00', undefined, CHICAGO)
    const [candidate] = lunarOccultation(sky)
    expect(Math.abs(candidate.from - Date.parse('2026-10-06T09:17:23Z'))).toBeLessThan(2 * MINUTE)
    expect(eventsOf(sky, [lunarOccultation])).toMatchObject([{ what: 'צדק מגיח מאחורי הירח', when: { tell: 'at' } }])
  })
})

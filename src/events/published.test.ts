import { describe, expect, it } from 'vitest'
import { fullMoonNear } from '../astro/fullMoon'
import { moonEquatorial } from '../astro/moon'
import { planetPosition, type PlanetName } from '../astro/planets'
import { peakNear, SHOWERS } from '../astro/showers'
import { eventsOf } from '.'
import { greatestOf, LUNAR_ECLIPSES } from './eclipseTable'
import { openSky } from '../test/eventForecast'
import { nowIn } from '../domain/now'

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR
const DEG = 180 / Math.PI
const ut = (at: string) => Date.parse(`${at}Z`)

describe('our times against published tables', () => {
  // F. Espenak, AstroPixels, "Phases of the Moon: 2001 to 2100" (http://astropixels.com/ephemeris/phasescat/phases2001.html).
  it.each(['2026-01-03T10:03', '2026-03-03T11:38', '2026-05-31T08:45', '2026-08-28T04:18', '2026-10-26T04:12', '2026-11-24T14:53',
    '2026-12-24T01:28', '2027-01-22T12:17', '2027-02-20T23:24', '2027-03-22T10:44', '2027-04-20T22:27', '2027-05-20T10:59',
    '2027-06-19T00:44', '2027-07-18T15:45', '2027-08-17T07:29', '2027-09-15T23:04', '2027-10-15T13:47', '2027-11-14T03:26',
    '2027-12-13T16:09'])('the full moon of %s UT, from two days off, within an hour', (at) => {
    for (const off of [-2 * DAY, 2 * DAY]) expect(Math.abs(fullMoonNear(ut(at) + off) - ut(at))).toBeLessThan(HOUR)
  })

  // AstroPixels, "Sky Event Almanac" 2026 and 2027 (https://astropixels.com/almanac/almanac21/almanac2026gmt.html and
  // almanac2027gmt.html), conjunctions of a planet with the moon: degrees north (+) of it.
  it.each([['jupiter', '2026-12-27T17:32', 1.5], ['jupiter', '2027-01-24T00:24', 1.5], ['jupiter', '2027-02-20T05:46', 1.2],
    ['venus', '2027-03-04T18:59', 2.1], ['jupiter', '2027-03-19T10:05', 0.9], ['mars', '2027-03-19T18:33', 4.3],
    ['venus', '2027-04-04T06:49', -3.3], ['jupiter', '2027-04-15T15:01', 1], ['jupiter', '2027-05-12T22:49', 1.3],
    ['mars', '2027-06-10T22:45', 3.9], ['mars', '2027-11-30T07:53', 1.6], ['venus', '2027-11-30T13:20', 0.9],
    ['mars', '2027-12-29T12:10', -0.5]] as [PlanetName, string, number][])('%s beside the moon at %s UT, %d° north', (name, at, north) => {
    const apart = (ms: number) => {
      const moon = moonEquatorial(new Date(ms)), planet = planetPosition(name, new Date(ms))
      const along = moon.rightAscension - planet.rightAscension
      return { along: Math.atan2(Math.sin(along), Math.cos(along)) * DEG, north: (planet.declination - moon.declination) * DEG }
    }
    let met = ut(at)
    for (let k = 0; k < 6; k++) met -= apart(met).along / 12.6 * DAY
    expect(Math.abs(met - ut(at))).toBeLessThan(40 * MINUTE)
    expect(Math.abs(apart(met).north - north)).toBeLessThan(0.15)
  })

  // International Meteor Organization, "2026 / 2027 Meteor Shower Calendar" (https://www.imo.net/files/meteor-shower/cal2026.pdf
  // and cal2027.pdf): the peaks given with an hour.
  it.each([['Quadrantids', '2026-01-03T21:00'], ['Quadrantids', '2027-01-04T03:25'], ['Lyrids', '2026-04-22T19:40'],
    ['Lyrids', '2027-04-23T01:40'], ['Perseids', '2026-08-13T03:00'], ['Perseids', '2027-08-13T09:00'], ['Draconids', '2026-10-09T01:00'],
    ['Leonids', '2026-11-17T23:45'], ['Leonids', '2027-11-18T06:00'], ['Geminids', '2026-12-14T14:00'], ['Geminids', '2027-12-14T20:00'],
    ['Ursids', '2026-12-22T22:00'], ['Ursids', '2027-12-23T04:00']])('the peak of the %s at %s UT, within an hour', (name, at) => {
    const shower = SHOWERS.find((s) => s.name === name)!
    expect(Math.abs(peakNear(shower, ut(at) + 3 * DAY) - ut(at))).toBeLessThan(HOUR)
  })

  it('holds the eclipses in order, each at our own full moon', () => {
    const times = LUNAR_ECLIPSES.map(greatestOf)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
    for (const ms of times) expect(Math.abs(fullMoonNear(ms + DAY) - ms)).toBeLessThan(1.5 * HOUR)
  })

  it('tells an eclipse where the moon is up, at its published hours, and not elsewhere', () => {
    const told = (now: string) => eventsOf(openSky(now)).find((e) => e.what.startsWith('ליקוי'))
    // 2028-12-31: greatest 16:51:58 UT, total from 16:16 to 17:27 UT (18:16 to 19:27 in Israel).
    const eclipse = told('2028-12-31T12:00')!
    expect(eclipse).toMatchObject({ what: 'ליקוי ירח מלא', when: { tell: 'span' } })
    expect(Math.abs(Date.parse(`${eclipse.when.from}Z`) - ut('2028-12-31T18:16'))).toBeLessThanOrEqual(10 * MINUTE)
    expect(Math.abs(Date.parse(`${eclipse.when.to}Z`) - ut('2028-12-31T19:27'))).toBeLessThanOrEqual(10 * MINUTE)
    // 2032-04-25: the moon comes up after totality (18:40 in Israel), and only the partial phase is seen, until 19:58.
    expect(told('2032-04-25T12:00')).toMatchObject({ what: 'ליקוי ירח חלקי' })
    // 2033-10-08, greatest at 10:55 UT: daylight in Israel.
    expect(told('2033-10-08T07:00')).toBeUndefined()
    expect(nowIn('Asia/Jerusalem', new Date(greatestOf(LUNAR_ECLIPSES[2])))).toBe('2028-12-31T18:51')
  })
})

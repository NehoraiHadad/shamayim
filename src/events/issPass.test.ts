import { describe, expect, it } from 'vitest'
import { issPosition, parseIssOrbit } from '../astro/iss'
import { openSky, PLACE } from '../test/eventForecast'
import tle from '../test/fixtures/iss-tle.json'
import { issPasses } from './issPass'
import { seen } from './seen'
import type { EventSky } from './types'

const london = { ...PLACE, id: 'london', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' }
const orbit = parseIssOrbit(tle)!
const ut = (clock: string) => Date.parse(`2026-11-25T${clock}Z`)
const opportunities = (sky: EventSky) => issPasses(orbit)(sky).map((candidate) => seen(candidate, sky)).filter((event) => event !== null)

describe('ISS orbital prediction', () => {
  it('reads the element epoch and rejects a damaged or unrelated TLE', () => {
    expect(Math.abs(orbit.epoch - tle.tle_timestamp * 1000)).toBeLessThan(1000)
    expect(parseIssOrbit({ ...tle, line1: `${tle.line1.slice(0, -1)}5` })).toBeNull()
    expect(parseIssOrbit({ ...tle, line2: tle.line2.replace('25544', '25545') })).toBeNull()
    expect(parseIssOrbit({ message: 'Rate limit reached' })).toBeNull()
  })

  // Public TLE snapshot verified with Skyfield 1.55, WGS84 and JPL DE421, with geometric look angles.
  it.each([
    ['03:00:00', -53.15, 148.05, true],
    ['17:38:00', 11.31, 278.80, true],
    ['17:41:10', 69.95, 190.54, true],
    ['17:43:00', 23.76, 116.34, false],
  ])('gets the topocentric direction and sunlight over London at %s UTC', (clock, altitude, azimuth, sunlit) => {
    const look = issPosition(orbit, london, ut(clock))!
    expect(Math.abs(look.altitude - altitude)).toBeLessThan(0.05)
    expect(Math.abs(look.azimuth - azimuth)).toBeLessThan(0.05)
    expect(look.sunlit).toBe(sunlit)
  })

  it('does not propagate an orbit once its elements are too old', () => {
    expect(issPosition(orbit, london, Date.parse('2026-11-28T00:00:00Z'))).toBeNull()
    expect(issPasses(orbit)(openSky('2026-11-28T13:00', undefined, london))).toEqual([])
  })
})

describe('ISS passes worth watching', () => {
  it('shows the bright pass with a moving direction and ends it when the station enters shadow', () => {
    const sky = openSky('2026-11-25T13:00', undefined, london)
    const [candidate, ...others] = issPasses(orbit)(sky)
    expect(others).toEqual([]) // Later pass enters shadow before getting high enough.
    expect(issPosition(orbit, london, ut('16:06:00'))).toMatchObject({ sunlit: true })
    expect(sky.sunAt(ut('16:06:00')).altitude).toBeGreaterThan(-6) // The earlier illuminated pass is too bright locally.
    expect(candidate.at(ut('17:42:30'))?.altitude).toBeGreaterThan(30)
    expect(candidate.at(ut('17:43:00'))).toBeNull()
    const event = seen(candidate, sky)!
    expect(event).toMatchObject({ viewing: 'expected', when: { from: '2026-11-25T17:37', to: '2026-11-25T17:42', tell: 'span' } })
    expect(event.where.azimuth).toBeCloseTo(279.1, 0)
    expect(Math.abs(event.track!.to.azimuth - 118.5)).toBeLessThan(3)
  })

  it('uses the same local terrain and cloud rules as other events', () => {
    const sky = openSky('2026-11-25T13:00', undefined, london)
    expect(opportunities({ ...sky, clear: () => false })).toEqual([])
    expect(opportunities({ ...sky, coversAt: () => ({ low: 1, mid: 1, high: 1 }) })).toEqual([])
    const [clipped] = opportunities({ ...sky, clear: ({ altitude }) => altitude >= 40 })
    expect(clipped.where.altitude).toBeGreaterThanOrEqual(40)
    expect(clipped.track?.to.altitude).toBeGreaterThanOrEqual(40)
  })

  it('still finds an ongoing pass when the high point is already past', () => {
    const [event] = opportunities(openSky('2026-11-25T17:42', undefined, london))
    expect(event.when).toMatchObject({ from: '2026-11-25T17:42', to: '2026-11-25T17:42' })
    expect(event.where.altitude).toBeGreaterThan(40)
  })
})

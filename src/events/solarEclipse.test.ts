import { describe, expect, it } from 'vitest'
import { localSolarEclipse } from '../astro/solarEclipse'
import { SOLAR_ECLIPSES } from '../astro/solarEclipseElements'
import { utcOf } from '../astro/utc'
import type { LocalTime } from '../domain/types'
import { openSky, PLACE } from '../test/eventForecast'
import { eventsOf } from '.'
import { solarEclipse } from './solarEclipse'

const JERUSALEM = { ...PLACE, lat: 31.779, lon: 35.225, elevation: 800 }
const at = (time: LocalTime) => utcOf(time, JERUSALEM.timezone).getTime()
const eclipseOn = (date: string) => SOLAR_ECLIPSES.find((e) => new Date(e.epoch).toISOString().startsWith(date))!
const eclipseEvents = (sky: ReturnType<typeof openSky>) => eventsOf(sky, [solarEclipse])

describe('solar eclipses at the shown place', () => {
  // Time and Date's published circumstances for Jerusalem, https://www.timeanddate.com/eclipse/in/israel/jerusalem.
  it.each([
    ['2027-08-02', '11:40', '13:00', '14:18'],
    ['2030-06-01', '06:42', '07:51', '09:10'],
    ['2034-03-20', '11:41', '13:04', '14:23'],
    ['2037-01-16', '10:29', '11:56', '13:21'],
  ])('matches the contacts and maximum on %s in Jerusalem to within one minute', (date, from, peak, to) => {
    const local = localSolarEclipse(eclipseOn(date), JERUSALEM)!
    expect(local.central).toBeNull()
    expect(Math.abs(local.partial.from - at(`${date}T${from}`))).toBeLessThan(60_000)
    expect(Math.abs(local.partial.peak - at(`${date}T${peak}`))).toBeLessThan(60_000)
    expect(Math.abs(local.partial.to - at(`${date}T${to}`))).toBeLessThan(60_000)
  })

  // NASA's Besselian tables give the place and duration of greatest eclipse for both central phases.
  it.each([
    ['2027-08-02', 25 + 30.3 / 60, 33 + 11 / 60, 'total', 382.6],
    ['2030-06-01', 56 + 31.5 / 60, 80 + 4.5 / 60, 'annular', 320.8],
  ] as const)('distinguishes a local central phase from the eclipse across the region on %s', (date, lat, lon, kind, seconds) => {
    const { central, partial } = localSolarEclipse(eclipseOn(date), { lat, lon })!
    expect(central?.kind).toBe(kind)
    expect(central!.from).toBeGreaterThan(partial.from)
    expect(central!.to).toBeLessThan(partial.to)
    expect(Math.abs((central!.to - central!.from) / 1000 - seconds)).toBeLessThan(2)
  })

  it('passes exact local contacts and maximum into the shared daylight event filter', () => {
    const sky = openSky('2027-08-02T10:00', undefined, JERUSALEM)
    expect(eclipseEvents(sky)).toMatchObject([{
      what: 'ליקוי חמה חלקי', kind: 'solar-eclipse', viewing: 'expected', peak: '2027-08-02T13:00',
      when: { from: '2027-08-02T11:40', to: '2027-08-02T14:18', tell: 'span' },
    }])
    expect(eclipseEvents({ ...sky, clear: () => false })).toEqual([])
    expect(eclipseEvents({ ...sky, coversAt: () => ({ low: 1, mid: 0, high: 0 }) })).toEqual([])
  })

  it('shows only the remaining partial phase and omits a peak that has passed', () => {
    const [event] = eclipseEvents(openSky('2027-08-02T13:30', undefined, JERUSALEM))
    expect(event.when.from).toBe('2027-08-02T13:30')
    expect(event.peak).toBeUndefined()
    expect(eclipseEvents(openSky('2027-08-02T15:00', undefined, JERUSALEM))).toEqual([])
  })

  it.each(['2026-08-12', '2027-02-06', '2028-07-22'])(
    'skips the global eclipse of %s when it does not appear above Jerusalem’s horizon',
    (date) => expect(eclipseEvents(openSky(`${date}T09:00`, undefined, JERUSALEM))).toEqual([]),
  )
})

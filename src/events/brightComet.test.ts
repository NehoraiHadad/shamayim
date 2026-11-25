import { describe, expect, it } from 'vitest'
import { cometPosition } from '../astro/comet'
import { siderealTime } from '../astro/sun'
import { openSky } from '../test/eventForecast'
import { cometEvents } from './brightComet'
import type { CometTrack } from './cometFeed'
import { seen } from './seen'
import type { EventSky } from './types'

const at = (time: string) => Date.parse(`2024-10-15T${time}:00Z`)

// C/2023 A3 on October 15, 2024. Positions are from NASA/JPL Horizons. The filtered visual brightness
// estimate and observation times are from the COBS Comet Observation Database (CC BY-NC-SA 4.0).
const track: CometTrack = {
  designation: 'C/2023 A3', magnitude: 1.9, observedAt: Date.parse('2024-10-15T09:21:36Z'),
  corroboratedAt: Date.parse('2024-10-15T09:07:12Z'), nakedEyeAt: Date.parse('2024-10-15T09:21:36Z'),
  samples: [
    [at('12:00'), 227.512217466, 0.460062700, 73_650_338.067, 28.0585],
    [at('15:00'), 228.137823090, 0.524930441, 73_905_665.643, 28.5736],
    [at('18:00'), 228.758240728, 0.588990110, 74_170_373.950, 29.0836],
  ],
}

const skyOf = () => openSky('2024-10-15T12:00', () => ({ visibility: 40_000 }))
const tell = (sky: EventSky, comet = track) => cometEvents([comet])(sky).map((candidate) => seen(candidate, sky)).find(Boolean)

describe('a bright comet in the local sky', () => {
  it('uses the tabulated comet position to find a time and direction in the evening', () => {
    const event = tell(skyOf())
    expect(event).toMatchObject({ what: expect.stringContaining('C/2023 A3'), kind: 'comet', viewing: 'expected', when: { tell: 'at' } })
    expect(event?.when.from).toBe('2024-10-15T19:30')
    expect(event?.where.azimuth).toBeGreaterThan(245)
    expect(event?.where.azimuth).toBeLessThan(275)
  })

  it('omits a comet with no evidence window or unusable local viewing', () => {
    const sky = skyOf()
    expect(cometEvents([])(sky)).toEqual([])
    expect(tell(sky, { ...track, observedAt: Date.parse('2024-10-12T00:00Z') })).toBeUndefined()
    expect(tell(sky, { ...track, nakedEyeAt: undefined })).toBeUndefined()
    expect(tell(sky, { ...track, magnitude: 4 })).toBeUndefined()
    expect(tell(sky, { ...track, samples: track.samples.map(([ms, ra, dec, distance]) => [ms, ra, dec, distance, 10]) })).toBeUndefined()
    expect(tell({ ...sky, clear: () => false })).toBeUndefined()
    expect(tell({ ...sky, coversAt: () => ({ low: 0.6, mid: 0, high: 0 }) })).toBeUndefined()
    expect(tell({ ...sky, sunAt: () => ({ altitude: -4, azimuth: 270 }) })).toBeUndefined()
    expect(tell({ ...sky, glow: 500 })).toBeUndefined()
    expect(tell(openSky('2024-10-15T12:00', () => ({ visibility: 5000 })))).toBeUndefined()
    expect(tell({ ...sky, moonAt: () => ({ altitude: 15, azimuth: 264 }) })).toBeUndefined()
  })

  it('interpolates through zero right ascension without extrapolating', () => {
    const middle = at('13:30'), lon = -siderealTime(new Date(middle), 0) * 180 / Math.PI % 360
    const wrapped: CometTrack = { ...track, samples: [[at('12:00'), 359, 0, 100e6, 32], [at('15:00'), 1, 0, 100e6, 32]] }
    expect(cometPosition(wrapped, middle, 0, lon)?.altitude).toBeCloseTo(90, 5)
    expect(cometPosition(wrapped, at('16:00'), 0, lon)).toBeNull()
  })
})

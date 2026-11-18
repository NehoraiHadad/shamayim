import { describe, expect, it } from 'vitest'
import type { RainOutlook } from '../../domain/rainNowcast'
import { distanceKm, type LonLat } from './geo'
import { motionArrow } from './motionArrow'

const place: LonLat = [35.5, 32.4]
const KM_PER_PX = 1
const dry: RainOutlook = { now: 0, arrivesIn: null, lastsFor: null, band: 0, nearest: null, approach: null, motion: null }
const passing = (heading: number, kmh = 30): RainOutlook =>
  ({ ...dry, nearest: { km: 30, bearing: 270, band: 1 }, motion: { kmh, heading } })

/** Compass bearing from a to b, degrees. */
function bearing([lon1, lat1]: LonLat, [lon2, lat2]: LonLat) {
  const r = Math.PI / 180
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r)
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r)
  return ((Math.atan2(y, x) / r) + 360) % 360
}

describe('motion arrow', () => {
  it.each([0, 45, 90, 135, 180, 225, 270, 315])('points along the motion (%i°)', (heading) => {
    const [[tail, tip]] = motionArrow(passing(heading), place, KM_PER_PX)!
    expect(Math.abs(((bearing(tail, tip) - heading + 540) % 360) - 180)).toBeLessThan(1)
  })

  it('starts on the arriving rain when rain is coming', () => {
    const coming = { ...dry, arrivesIn: 40, band: 2 as const, approach: { km: 20, bearing: 270 }, motion: { kmh: 30, heading: 90 } }
    const [[tail]] = motionArrow(coming, place, KM_PER_PX)!
    expect(distanceKm(place, tail)).toBeCloseTo(20, 3)
    expect(bearing(place, tail)).toBeCloseTo(270, 0)
  })

  it('is half an hour of travel long, clamped to 24–64 px', () => {
    const length = (kmh: number) => { const [[tail, tip]] = motionArrow(passing(90, kmh), place, KM_PER_PX)!; return distanceKm(tail, tip) }
    expect(length(80)).toBeCloseTo(40, 3)
    expect(length(10)).toBeCloseTo(24, 3)
    expect(length(200)).toBeCloseTo(64, 3)
  })

  it('draws a two-stroke head at the tip', () => {
    const [, head] = motionArrow(passing(90), place, KM_PER_PX)!
    expect(head).toHaveLength(3)
    expect(distanceKm(head[0], head[1])).toBeCloseTo(9, 3)
    expect(distanceKm(head[2], head[1])).toBeCloseTo(9, 3)
  })

  it('draws nothing when there is nothing honest to show', () => {
    expect(motionArrow(null, place, KM_PER_PX)).toBeNull()
    expect(motionArrow({ ...passing(90), now: 2 }, place, KM_PER_PX)).toBeNull()
    expect(motionArrow({ ...passing(90), motion: null }, place, KM_PER_PX)).toBeNull()
    expect(motionArrow(passing(90, 3), place, KM_PER_PX)).toBeNull()
    expect(motionArrow({ ...passing(90), nearest: { km: 120, bearing: 0, band: 2 } }, place, KM_PER_PX)).toBeNull()
  })
})

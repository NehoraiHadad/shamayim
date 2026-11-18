import { describe, expect, it } from 'vitest'
import { circle, destination, distanceKm, type LonLat } from './geo'

const shadmot: LonLat = [35.5, 32.4]

describe('geo helpers', () => {
  it('goes north along a meridian', () => {
    const [lon, lat] = destination(shadmot, 111.195, 0)
    expect(lon).toBeCloseTo(35.5, 6)
    expect(lat).toBeCloseTo(33.4, 3)
  })

  it('goes east and comes back the same distance', () => {
    const east = destination(shadmot, 50, 90)
    expect(east[0]).toBeGreaterThan(shadmot[0])
    expect(distanceKm(shadmot, east)).toBeCloseTo(50, 6)
  })

  it.each([0, 45, 90, 135, 180, 225, 270, 315])('keeps the distance on bearing %i°', (bearing) => {
    expect(distanceKm(shadmot, destination(shadmot, 230, bearing))).toBeCloseTo(230, 6)
  })

  it('draws a closed ring at a constant distance', () => {
    const ring = circle(shadmot, 25)
    expect(ring).toHaveLength(73)
    expect(ring[0][0]).toBeCloseTo(ring[72][0], 9)
    expect(ring[0][1]).toBeCloseTo(ring[72][1], 9)
    for (const point of ring) expect(distanceKm(shadmot, point)).toBeCloseTo(25, 6)
  })
})

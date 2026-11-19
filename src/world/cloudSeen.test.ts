import { describe, expect, it } from 'vitest'
import { cloudSeenAttrs, seenPuffs } from './cloudSeen'

describe('seenPuffs', () => {
  it('puts a west-south-west cloud on the right, near the setting sun, and a near cloud higher than a far one', () => {
    const [near, far] = seenPuffs([
      { azimuth: 250, distanceKm: 4, widthKm: 5, strength: 1 },
      { azimuth: 250, distanceKm: 20, widthKm: 5, strength: 1 },
    ])
    expect(near.x).toBeGreaterThan(0.7)
    expect(near.altitude).toBeGreaterThan(far.altitude)
    expect(near.half).toBeGreaterThan(far.half)
  })
  it('leaves out clouds to the north, behind the picture', () => {
    expect(seenPuffs([{ azimuth: 0, distanceKm: 10, widthKm: 5, strength: 1 }])).toEqual([])
  })
  it('publishes nothing without clouds', () => {
    expect(cloudSeenAttrs([])).toEqual({})
    expect(cloudSeenAttrs(null)).toEqual({})
    expect(cloudSeenAttrs([{ azimuth: 180, distanceKm: 10, widthKm: 5, strength: 0.5 }])['data-cloud-seen']).toMatch(/^0\.500,/)
  })
})

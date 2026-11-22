import { describe, expect, it } from 'vitest'
import { cloudSightings, sightingsNow } from './cloudSightings'

/** An n×n mask from rows of '.' (clear) and '#' (cloud), north row first. */
const grid = (rows: string[]) => rows.join('').split('').map((c) => c === '#')

describe('cloudSightings', () => {
  it('finds one patch south-west of the place and says how far and how wide', () => {
    // 8 px over 40 km: 5 km a pixel; the place is the centre of the grid.
    const mask = grid([
      '........',
      '........',
      '........',
      '........',
      '........',
      '.##.....',
      '.##.....',
      '........',
    ])
    const [s, ...rest] = cloudSightings(mask, 8, 40)
    expect(rest).toHaveLength(0)
    // Centre at 10 km west, 10 km south.
    expect(s.azimuth).toBeCloseTo(225, 0)
    expect(s.distanceKm).toBeCloseTo(Math.hypot(10, 10), 1)
    expect(s.widthKm).toBeGreaterThan(5)
  })
  it('keeps separate patches apart and ranks the one that looks biggest first', () => {
    const mask = grid([
      '#.......',
      '........',
      '........',
      '....##..',
      '........',
      '........',
      '........',
      '.......#',
    ])
    const list = cloudSightings(mask, 8, 40)
    expect(list).toHaveLength(3)
    // The near two-pixel patch just east of the place outranks the far corners.
    expect(list[0].azimuth).toBeGreaterThan(45)
    expect(list[0].azimuth).toBeLessThan(90)
    expect(list[0].distanceKm).toBeLessThan(10)
  })
  it('sees nothing on a clear sky and drops patches beyond its reach', () => {
    expect(cloudSightings(grid(['....', '....', '....', '....']), 4, 20)).toEqual([])
    const far = grid(['#.......', ...Array(7).fill('........')])
    expect(cloudSightings(far, 8, 80)).toEqual([])
  })
})

describe('sightingsNow', () => {
  const sightings = [{ azimuth: 250, distanceKm: 8, widthKm: 6 }]
  it('draws fresh sightings on a mostly clear sky', () => {
    const got = sightingsNow({ cover: 5, at: '2026-11-18T16:15', sightings }, '2026-11-18T16:27', 5)
    expect(got).toEqual([{ ...sightings[0], strength: 1 }])
  })
  it('fades them as the image ages and leaves them to the cloud field on a busy sky', () => {
    expect(sightingsNow({ cover: 5, at: '2026-11-18T16:15', sightings }, '2026-11-18T17:25', 5)[0].strength).toBeCloseTo(0.5, 1)
    expect(sightingsNow({ cover: 5, at: '2026-11-18T16:15', sightings }, '2026-11-18T18:15', 5)).toEqual([])
    expect(sightingsNow({ cover: 60, at: '2026-11-18T16:15', sightings }, '2026-11-18T16:27', 60)).toEqual([])
    expect(sightingsNow(null, '2026-11-18T16:27', 5)).toEqual([])
  })

  it('crossfades both satellite sets with stable identities and rolls off on a busy sky', () => {
    const now = '2026-11-18T16:50'
    const receivedAt = 900_000
    const west = { at: '2026-11-18T16:15', cover: 5, sightings, receivedAt: 0 }
    const east = { at: '2026-11-18T16:30', cover: 5, sightings: [{ ...sightings[0], azimuth: 90 }],
      receivedAt, previous: west }
    const before = sightingsNow(east, now, 40, receivedAt)
    expect(before).toEqual(sightingsNow(west, now, 40, receivedAt))
    const halfway = sightingsNow(east, now, 45, receivedAt + 300_000)
    expect(halfway.map(({ strength }) => strength)).toEqual([0.25, 0.25])
    expect(halfway[0].id).toBe(before[0].id)
    const after = sightingsNow(east, now, 40, receivedAt + 600_000)
    expect(after).toEqual([{ ...east.sightings[0], strength: 1, id: halfway[1].id }])
    expect(sightingsNow(east, now, 50, receivedAt + 600_000)).toEqual([])
  })
})

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
})

import { describe, expect, it } from 'vitest'
import { coarseCoverFromJson, combineLandCovers, type LandCover } from '../data/land/coverCodec'
import { encodeLand, LAND_STEP } from '../data/land/grid'
import { SCENE_CAMERA } from '../domain/camera'
import { SHADMOT_TERRAIN, typedCover } from '../test/livingLandFixtures'
import { livingLandOf } from './landLiving'

const landAt = (lat: number, lon: number, cover: LandCover) => livingLandOf({ lat, lon, elevationM: 0, shownDate: '2026-11-15',
  shownUtcDate: '2026-11-15', camera: SCENE_CAMERA, terrain: SHADMOT_TERRAIN, data: { cover, near: null, far: null, weather: null } })
const coverOf = (classAt: (lat: number, lon: number) => number): LandCover => ({ coverAt: classAt })
const known = (lat: number, lon: number, cover: LandCover) =>
  landAt(lat, lon, cover).rays.map(({ near, bands }) => typeof near === 'object' && bands[0].sample.cover !== null)
const EAST = SCENE_CAMERA.heading - 90, WEST = SCENE_CAMERA.heading + 90

describe('the near ground over the antimeridian', () => {
  /** A 1° strip of crops each side of 180°, kept once in canonical longitudes and once in the run of a place east or west of it. */
  const grid = (west: number, east: number) => {
    const [rows, cols, stepDeg] = [100, Math.round((east - west) / 0.01), 0.01]
    return coarseCoverFromJson({ v: 1, bbox: [9.5, west, 10.5, east], stepDeg, rows, cols, r: encodeLand(new Uint8Array(rows * cols).fill(4)) })
  }
  const canonical = combineLandCovers(grid(-180, -179), grid(179, 180))!

  it.each([['east from 179.999 E', 179.999, grid(179, 181)], ['west from 179.999 W', -179.999, grid(-181, -179)]] as const)(
    'is known looking %s, in either frame of the grid', (_, lon, run) => {
      expect(known(10, lon, canonical)).not.toContain(false)
      expect(known(10, lon, run)).not.toContain(false)
    })

  it('reads the far side of the line, not this one', () => {
    // Crops east of the line, bare ground west of it.
    const land = landAt(10, 179.999, coverOf((_, lon) => lon >= -180 && lon < -179 ? 4 : lon >= 179 && lon < 180 ? 6 : 0))
    const own = landAt(10, 179.999, typedCover(6, 'worldcover-2021:remote-1km')), far = landAt(10, 179.999, typedCover(4, 'worldcover-2021:remote-1km'))
    const at = (l: typeof land, azimuth: number) => l.rays.reduce((a, b) => Math.abs(b.azimuth - azimuth) < Math.abs(a.azimuth - azimuth) ? b : a).near
    expect(at(land, WEST)).toEqual(at(own, WEST))
    const blue = (near: ReturnType<typeof at>) => (near as { albedo: readonly number[] }).albedo[2]
    const part = (blue(at(land, EAST)) - blue(at(own, EAST))) / (blue(at(far, EAST)) - blue(at(own, EAST)))
    // The line is 110 m east of the eye: the footprint's circle of 400 m has the larger part of its area beyond it.
    expect(part).toBeGreaterThan(0.6)
    expect(part).toBeLessThan(0.95)
  })
})

describe('the near ground at 62° N', () => {
  it('passes over no column of the cover grid, though they are narrower than half a row', () => {
    const lat = 62, lon = 35.0123, eye = Math.floor(lon / LAND_STEP)
    for (let column = eye - 4; column <= eye + 4; column++) {
      // One column of crops in open water, straight ahead and to either side.
      const strip = landAt(lat, lon, coverOf((_, at) => Math.floor(at / LAND_STEP) === column ? 4 : 8))
      expect(strip.rays.some(({ near }) => typeof near === 'object')).toBe(true)
    }
  })

  it('has none nearer the poles than the cover itself goes', () => {
    const polar = landAt(89.9, 35.0123, typedCover(4, 'worldcover-2021:remote-1km'))
    expect(polar.rays.every(({ near }) => near === undefined)).toBe(true)
  })
})

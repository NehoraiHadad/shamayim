import { describe, expect, it } from 'vitest'
import { climatologyAt } from '../data/land/climatology'
import { COVER_WATER, LAND_STEP } from '../data/land/grid'
import type { LandCover } from '../data/land/landData'
import type { LandData } from '../data/land/types'
import { azimuthAt, SCENE_CAMERA, STORED_CAMERA } from '../domain/camera'
import { makeFar, makeNear, SHADMOT, SHADMOT_TERRAIN, typedCover } from '../test/livingLandFixtures'
import { LIVING_LAND_RAYS, livingLandOf, type LivingLand } from './landLiving'
import { linearRgbToSrgb } from './landRadiometry'
import { livingLandKey, M_PER_DEG } from './landRays'
import { FIRST_RING_M, footprintOf, nearGroundOf, type GroundCell } from './nearGround'
import type { RGB } from './types'

const RAD = Math.PI / 180
const CELL_M = LAND_STEP * M_PER_DEG
/** Equator, mid-latitude, and where the grid's columns are narrower than half a cell. */
const LATS = [0, 32.35, 62]
const footprint = <Cell>(lat: number, read: (eastM: number, northM: number) => Cell) =>
  footprintOf(lat, 35.0123, Math.cos(lat * RAD), read)
const areaOf = (shares: readonly { weight: number }[]) => shares.reduce((sum, { weight }) => sum + weight, 0)

describe('footprintOf', () => {
  it.each(LATS)('weighs the area of the circle from the eye to the first DEM ring at latitude %d', (lat) => {
    const near = footprint(lat, () => 1), circle = Math.PI * (FIRST_RING_M / 2) ** 2
    const cosLat = Math.cos(lat * RAD), cellM2 = CELL_M * CELL_M * cosLat * Math.max(1, Math.round(1 / cosLat))
    for (let azimuth = 0; azimuth < 360; azimuth += 15) expect(areaOf(near(azimuth)) * cellM2 / circle).toBeCloseTo(1, 1)
  })

  it('turns no sharper between bearings than two circles that share the eye', () => {
    // Circles of radius R about centres 2R sin(d/2) apart differ by at most that shift over their width, 4 sin(d/2) / pi of
    // the area; one cell column of the rim is the grid's own error. The sharpest cover: town and wood either side of a line.
    const gridError = CELL_M * CELL_M / (Math.PI * (FIRST_RING_M / 2) ** 2)
    for (const edge of [0, 45, 90, 130]) {
      const near = footprint(32.35, (e, n) => e * Math.cos(edge * RAD) - n * Math.sin(edge * RAD) > 0)
      const townOn = (azimuth: number) => {
        const shares = near(azimuth)
        return areaOf(shares.filter(({ cell }) => cell)) / areaOf(shares)
      }
      for (let azimuth = 0; azimuth < 360; azimuth += 2) {
        expect(Math.abs(townOn(azimuth + 2) - townOn(azimuth))).toBeLessThan((4 * Math.sin(RAD)) / Math.PI + gridError)
      }
    }
  })
})

describe('nearGroundOf', () => {
  const of = (...shares: [GroundCell, number][]) => nearGroundOf(shares.map(([cell, weight]) => ({ cell, weight })))
  const wood: GroundCell = { rho: [0.02, 0.04, 0.02], source: 'wood' }, sand: GroundCell = { rho: [0.4, 0.3, 0.2], source: 'sand' }

  it('means the dry cells by area in linear light, and leaves water out', () => {
    const expected = linearRgbToSrgb([0.4 * 0.75 + 0.02 * 0.25, 0.3 * 0.75 + 0.04 * 0.25, 0.2 * 0.75 + 0.02 * 0.25])
    const near = of([sand, 6], [wood, 2], ['water', 30]) as { albedo: RGB; source: string }
    near.albedo.forEach((v, k) => expect(v).toBeCloseTo(expected[k], 9))
    expect(near.source).toBe('sand')
  })

  it('is open water, not unknown, where every cell is water', () => {
    expect(of(['water', 12])).toBe('water')
  })

  it('is unknown where the unclassified ground is as large as the classified dry ground', () => {
    expect(of([sand, 2], [null, 2], ['water', 8])).toBeUndefined()
    expect(of([null, 5], ['water', 8])).toBeUndefined()
    expect(of([sand, 3], [null, 2])).toMatchObject({ source: 'sand' })
  })
})

describe('the land\'s near ground', () => {
  const at = (data: LandData | null, lat = SHADMOT.lat, lon = SHADMOT.lon, camera = SCENE_CAMERA) => livingLandOf({ lat, lon,
    elevationM: -175, shownDate: '2026-11-15', shownUtcDate: '2026-11-15', camera, terrain: SHADMOT_TERRAIN, data })
  const only = (cover: LandCover): LandData => ({ cover, near: null, far: null, weather: null })
  const coverOf = (classAt: (lat: number, lon: number) => number): LandCover => ({
    coverAt: classAt,
    coverWithSourceAt: (lat, lon) => {
      const cover = classAt(lat, lon)
      return cover > 0 ? { cover, source: 'worldcover-2021:local-50m' } : { cover: null, source: 'unknown' }
    },
  })
  const nearOf = (land: LivingLand) => land.rays.map(({ near }) => near)

  it('reads a cover cell of the footprints once for all the rays', () => {
    const read: string[] = []
    const near = footprint(32.35, (e, n) => read.push(`${e.toFixed(1)}:${n.toFixed(1)}`))
    for (let i = 0; i < LIVING_LAND_RAYS; i++) near(azimuthAt(i / (LIVING_LAND_RAYS - 1)))
    console.info('near ground cells read on a place load', read.length)
    expect(new Set(read).size).toBe(read.length)
    // The circles lie in the circle of twice the radius about the eye: no more cells than it and its rim hold.
    expect(read.length).toBeLessThan(Math.PI * (FIRST_RING_M + CELL_M) ** 2 / (CELL_M * CELL_M * Math.cos(32.35 * RAD)))
  })

  it('is in the land: a clone has it, and one cell of another class is another key', () => {
    const wood = at(only(coverOf(() => 1)))
    expect(structuredClone(wood)).toEqual(wood)
    expect(nearOf(wood).every((near) => typeof near === 'object')).toBe(true)
    // One cell 200 m south: between the eye and the first ring, under no ray band and no point of the 3 x 3 grid.
    const row = Math.floor((SHADMOT.lat - 200 / M_PER_DEG) / LAND_STEP), col = Math.floor(SHADMOT.lon / LAND_STEP)
    const glade = at(only(coverOf((lat, lon) => Math.floor(lat / LAND_STEP) === row && Math.floor(lon / LAND_STEP) === col ? 6 : 1)))
    expect(glade.rays.map(({ bands }) => bands)).toEqual(wood.rays.map(({ bands }) => bands))
    expect(glade.local).toEqual(wood.local)
    expect(livingLandKey(glade)).not.toBe(livingLandKey(wood))
  })

  it('gives a class one colour where the climate changes under the footprint, whichever bearing is asked first', () => {
    // The climate's cells meet at half degrees: a line between two of them 1 m from the eye, on either side of it.
    const dry = (lat: number, lon: number) => climatologyAt(lat, lon, -175, 11, 3).rgb.join()
    const lines = [30.25, 30.75, 31.25, 31.75, 32.25].flatMap((lat) => [34.5, 35, 35.5, 36, 36.5].map((lon) => ({ lat, lon })))
    const { lat, lon: line } = lines.find((l) => dry(l.lat, l.lon - 1e-5) !== dry(l.lat, l.lon + 1e-5))!
    const grass = only(coverOf(() => 3))
    for (const lon of [line - 1e-5, line + 1e-5]) {
      const eastFirst = at(grass, lat, lon), westFirst = at(grass, lat, lon, STORED_CAMERA)
      expect(eastFirst.rays[0].azimuth).toBeCloseTo(westFirst.rays.at(-1)!.azimuth, 6)
      const colours = (land: LivingLand) => nearOf(land).map((near) => (near as { albedo: RGB }).albedo.map((v) => v.toFixed(9)).join())
      expect(colours(eastFirst)).toEqual(colours(westFirst).reverse())
      expect(new Set(colours(eastFirst)).size).toBe(1)
    }
  })

  it('is unknown without the cover grid, whatever the satellites see, and water where the cover is all water', () => {
    expect(nearOf(at(null)).every((near) => near === undefined)).toBe(true)
    expect(nearOf(at({ ...only(typedCover(4, 'unknown')), cover: null, near: makeNear(), far: makeFar() })).every((near) => near === undefined)).toBe(true)
    expect(nearOf(at(only(coverOf(() => 0)))).every((near) => near === undefined)).toBe(true)
    expect(nearOf(at(only(coverOf(() => COVER_WATER)))).every((near) => near === 'water')).toBe(true)
  })

  it('takes the satellite\'s colour of each cell where the cover tells it is dry', () => {
    const seen = at({ cover: typedCover(4, 'worldcover-2021:local-50m'), near: makeNear(), far: null, weather: null })
    expect(nearOf(seen)).toEqual(nearOf(seen).map(() => ({ albedo: expect.any(Array), source: 's2:2026-11-15' })))
    nearOf(seen).forEach((near) => (near as { albedo: RGB }).albedo.forEach((v, k) => expect(v).toBeCloseTo(seen.own.albedo[k], 9)))
  })
})

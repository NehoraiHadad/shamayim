import { describe, expect, it } from 'vitest'
import { CORNER, storedGroup, storedTile } from '../../test/villageTile'
import type { CityRaster } from '../city/cityRaster'
import { COVER, LAND_STEP } from '../land/grid'
import type { LandCover } from '../land/landData'
import { cellSettlement, HOUSE_M } from './cellSource'
import { footprintSettlement } from './footprintSource'
import { encodeHouses, LAT_M, lonM } from './houseCode'
import { readTile, type StoredGroup } from './tile'

const tileOf = (...groups: StoredGroup[]) => readTile(storedTile({ groups }))!
/** A place this many metres east and north of the fixture's corner. */
const at = (east: number, north: number) => ({ lat: CORNER[0] + north / LAT_M, lon: CORNER[1] + east / lonM(CORNER[0]) })
const footprints = (place = at(20, 0), tile = tileOf(storedGroup())) => {
  const found = footprintSettlement(tile, place)
  return found?.kind === 'footprints' ? found : null
}

describe('a settlement of footprints', () => {
  it('stands round the place, in km', () => {
    const { group, spots } = footprints()!
    const metres = spots.map(s => [Math.round(s.dx * 1000), Math.round(s.dy * 1000)])
    expect(metres).toEqual([[-20, 0], [0, 0], [20, 0], [0, 100]])
    expect(group).toMatchObject({ houses: 4 })
    expect(group.extentKm).toBeCloseTo(.1, 3)
  })
  it('keeps each house\'s facts, and its row', () => {
    const { spots, rows } = footprints()!
    expect(spots.map(s => [s.across, s.size, s.outline, s.row, s.holds])).toEqual(
      [[true, 0, true, 0, 1], [false, 2, false, 0, 1], [false, 3, false, 0, 1], [true, 1, true, null, 1]])
    expect(rows).toEqual([{ start: 0, count: 3, ring: false }])
  })
  it('keeps the file\'s licence, credits and day', () => expect(footprints()!.provenance).toEqual({
    source: 'Overture Maps buildings', licence: { id: 'ODbL-1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/' },
    credits: ['© OpenStreetMap contributors, Overture Maps Foundation'], release: '2026-11-18.0', built: '2026-11-24' }))
  it('gives a house one seed, wherever the place and in whichever order', () => {
    const seeds = footprints()!.spots.map(s => s.seed)
    expect(new Set(seeds).size).toBe(4)
    expect(footprints(at(40, 30))!.spots.map(s => s.seed)).toEqual(seeds)
  })
})

describe('the group a place belongs to', () => {
  const far = storedGroup({ o: [CORNER[0] + .004, CORNER[1]], p: [[CORNER[0] + .005, CORNER[1]]] })
  it('is the one with a house within the link distance', () => expect(footprints(at(90, 0))).not.toBeNull())
  it('is none beyond it, when no place point is near', () =>
    expect(footprints(at(150, 0), tileOf(storedGroup({ p: [[31.7, 35.1]] })))).toBeNull())
  it('is the one whose place point it stands at, in an empty middle', () =>
    expect(footprints(at(200, 0), tileOf(storedGroup({ p: [[31.6, at(260, 0).lon]] })))).not.toBeNull())
  it('is the one with the nearest house of two', () => {
    const both = tileOf(storedGroup(), far)
    expect(footprints(at(20, 0), both)!.spots[0].dy).toBeCloseTo(0, 3)
    expect(footprints(at(20, 445), both)!.spots[0].dy).toBeCloseTo(0, 3)
    expect(footprints(at(20, 445), tileOf(far, storedGroup()))).toEqual(footprints(at(20, 445), both))
  })
  it('is the one with the nearest place point when two share the house', () => {
    const point = (east: number): [number, number] => [CORNER[0], at(east, 0).lon]
    const one = storedGroup({ p: [point(-30)], s: .6 })
    const other = storedGroup({ p: [point(30)], r: [], h: encodeHouses([{ x: 10, y: 0, across: true, size: 0, outline: true }]) })
    expect(footprints(at(20, 0), tileOf(one, other))!.spots).toHaveLength(1)
    expect(footprints(at(20, 0), tileOf(other, one))!.spots).toHaveLength(1)
  })
})

describe('a settlement of cover cells', () => {
  const BUILT = COVER.indexOf('built'), CROP = COVER.indexOf('crop')
  const row0 = 63_200, col0 = 70_200
  const place = { lat: (row0 + .5) * LAND_STEP, lon: (col0 + .5) * LAND_STEP }
  const coverOf = (...cells: [row: number, col: number][]) => {
    const built = new Set(cells.map(([r, c]) => `${row0 + r}:${col0 + c}`))
    const coverAt = (lat: number, lon: number) => built.has(`${Math.floor(lat / LAND_STEP)}:${Math.floor(lon / LAND_STEP)}`) ? BUILT : CROP
    return { coverAt } as LandCover
  }
  const block: [number, number][] = [-1, 0, 1].flatMap(r => [-1, 0, 1].map((c): [number, number] => [r, c]))
  const cells = (cover: LandCover, raster?: CityRaster) => {
    const found = cellSettlement(place, cover, raster)
    return found?.kind === 'cells' ? found : null
  }

  it('is none with no built cell near', () => expect(cells(coverOf([40, 0]))).toBeNull())
  it('joins by side and corner, and leaves what an empty cell parts', () => {
    expect(cells(coverOf([0, 0], [1, 1], [1, 2]))!.spots).toHaveLength(3)
    expect(cells(coverOf(...block, [0, 8], [0, 9]))!.spots).toHaveLength(9)
  })
  it('marks its edge, and only its edge', () =>
    expect(cells(coverOf(...block))!.spots.filter(s => !s.outline).map(s => [s.dx, s.dy])).toEqual([[0, 0]]))
  it('holds the houses the raster says, and a guess where it knows nothing', () => {
    const areaM2 = LAND_STEP * LAT_M * LAND_STEP * lonM(place.lat)
    const known: CityRaster = { at: () => ({ built: .2, levels: 1, p90: 4 }) }
    expect(cells(coverOf([0, 0]), known)!.spots[0]).toMatchObject({ known: true, holds: .2 * areaM2 / HOUSE_M ** 2 })
    expect(cells(coverOf([0, 0]))!.spots[0]).toMatchObject({ known: false, holds: 2 })
  })
  it('names its sources', () => expect(cells(coverOf([0, 0]))!.provenance.credits).toHaveLength(2))
})

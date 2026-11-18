import { describe, expect, it } from 'vitest'
import { COLS, LAT_STEP, LON_STEP, squareCentre, squareOf } from '../../src/data/city/grid'
import { contains, eastMetres, footprint, METRES } from './geometry'
import { decodeForm } from '../../src/data/city/form'
import { Raster } from './raster'

const cell = '320_348'
const { lat, lon } = squareCentre({ cell, row: 6, col: 6 })
const rectangle = (dx: number, dy: number) => [[[
  [lon - dx, lat - dy], [lon + dx, lat - dy], [lon + dx, lat + dy], [lon - dx, lat + dy],
  [lon - dx, lat - dy],
] as [number, number][]]]
const share = (image: Raster, y: number, x: number) => image.bytes(cell)[(y * COLS + x) * 3] >> 4

describe('city raster', () => {
  it('puts a 100 × 100 m footprint into its centre square', () => {
    const shape = footprint(rectangle(50 / eastMetres(lat), 50 / METRES))!
    const image = new Raster()
    image.building(shape, 12.8)
    const { row, col } = squareOf(lat, lon)
    expect(shape.area).toBeCloseTo(10_000)
    expect(share(image, row, col)).toBe(5)
    expect(share(image, row, col + 1)).toBe(0)
  })

  it('spreads a large footprint over its bounding-box overlaps', () => {
    const image = new Raster()
    image.building(footprint(rectangle(1.5 * LON_STEP, LAT_STEP / 2))!, 6.4)
    expect([4, 5, 6, 7, 8].map(col => share(image, 6, col))).toEqual([0, 15, 15, 15, 0])
  })

  it('uses landuse only for centres with no footprint and respects holes', () => {
    const image = new Raster()
    const shape = rectangle(1.5 * LON_STEP, 1.5 * LAT_STEP)
    shape[0].push(rectangle(LON_STEP / 4, LAT_STEP / 4)[0][0].map(([x, y]) => [x + LON_STEP, y]))
    image.landuse(footprint(shape)!, (x, y) => contains(shape, x, y))
    image.building(footprint(rectangle(LON_STEP / 10, LAT_STEP / 10))!, 6.4)
    expect([5, 6, 7].map(col => share(image, 6, col))).toEqual([5, 1, 0])
  })

  it('keeps footprint-weighted levels and the building height p90', () => {
    const raster = new Raster()
    const small = footprint(rectangle(LON_STEP / 30, LAT_STEP / 30))!
    const large = footprint(rectangle(LON_STEP / 4, LAT_STEP / 4))!
    raster.building(large, 6.4)
    raster.building(small, 300)
    const i = (6 * COLS + 6) * 3
    expect(raster.bytes(cell)[i] & 15).toBe(2)
    expect(raster.bytes(cell)[i + 1]).toBe(255)
  })
})

it('packs the count median footprint and area-weighted large roof share', () => {
  const raster = new Raster()
  for (const area of [130, 130, 900]) {
    const shape = footprint(rectangle(5 / eastMetres(lat), area / (20 * METRES)))!
    raster.building(shape, 4)
  }
  expect(decodeForm(raster.bytes(cell)[(6 * COLS + 6) * 3 + 2])).toEqual({
    size: 3, big: 3, roof: 0, evidence: false,
  })
})

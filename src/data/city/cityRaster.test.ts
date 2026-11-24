import { expect, it } from 'vitest'
import { cityRaster } from './cityRaster'
import { COLS, ROWS, squareCentre } from './grid'

const square = { cell: '320_348', row: 14, col: 20 }, { lat, lon } = squareCentre(square)
const rasterOf = (values: number[]) => {
  const bytes = new Uint8Array(COLS * ROWS * values.length)
  bytes.set(values, (square.row * COLS + square.col) * values.length)
  return cityRaster(new Map([[square.cell, bytes]]))
}

it('reads the typical frontage by the size class, and knows none where the raster has none', () => {
  expect(rasterOf([243, 10, 3]).front!(lat, lon)).toBeCloseTo(Math.sqrt(Math.sqrt(120 * 220)))
  expect(rasterOf([243, 10, 7]).front!(lat, lon)).toBeCloseTo(Math.sqrt(5000))
  expect(rasterOf([243, 10, 0]).front!(lat, lon)).toBe(0)
  expect(rasterOf([243, 10]).front!(lat, lon)).toBe(0)
  expect(rasterOf([243, 10, 7]).front!(0, 0)).toBe(0)
})

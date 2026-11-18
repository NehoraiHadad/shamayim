import { COLS, ROWS, LAT_STEP, LON_STEP, squareCentre, squareOf } from '../../src/data/city/grid'
import type { Square } from '../../src/data/city/types'
import { METRES, eastMetres, type Footprint } from './geometry'

type Sample = { area: number; height: number }
type Pixel = { samples?: Sample[]; land?: number }
const squareArea = (lat: number) => LAT_STEP * LON_STEP * METRES * eastMetres(lat)
const slot = ({ row, col }: Square) => row * COLS + col

export function* squaresIn(bounds: Pick<Footprint, 'south' | 'west' | 'north' | 'east'>) {
  const first = squareOf(bounds.south, bounds.west), last = squareOf(bounds.north, bounds.east)
  const [sy, sx] = first.cell.split('_').map(Number)
  const [ny, ex] = last.cell.split('_').map(Number)
  for (let y = sy * ROWS + first.row; y <= ny * ROWS + last.row; y++) {
    for (let x = sx * COLS + first.col; x <= ex * COLS + last.col; x++) {
      const cy = Math.floor(y / ROWS), cx = Math.floor(x / COLS)
      const square = { cell: `${cy}_${cx}`, row: y - cy * ROWS, col: x - cx * COLS }
      yield { square, ...squareCentre(square) }
    }
  }
}

export class Raster {
  cells = new Map<string, Map<number, Pixel>>()

  private pixel(square: Square) {
    let cell = this.cells.get(square.cell)
    if (!cell) this.cells.set(square.cell, cell = new Map())
    const i = slot(square)
    let pixel = cell.get(i)
    if (!pixel) cell.set(i, pixel = {})
    return pixel
  }

  building(shape: Footprint, height: number) {
    const add = (square: Square, area: number) => {
      const pixel = this.pixel(square)
      ;(pixel.samples ??= []).push({ area, height })
    }
    if (shape.area < squareArea(shape.lat)) {
      add(squareOf(shape.lat, shape.lon), shape.area)
      return
    }
    const boundsArea = (shape.east - shape.west) * (shape.north - shape.south)
    for (const { square, lat, lon } of squaresIn(shape)) {
      const dy = Math.min(lat + LAT_STEP / 2, shape.north) - Math.max(lat - LAT_STEP / 2, shape.south)
      const dx = Math.min(lon + LON_STEP / 2, shape.east) - Math.max(lon - LON_STEP / 2, shape.west)
      if (dx > 1e-12 && dy > 1e-12) add(square, shape.area * dx * dy / boundsArea)
    }
  }

  landuse(shape: Footprint, inside: (lon: number, lat: number) => boolean) {
    for (const { square, lat, lon } of squaresIn(shape)) {
      if (!inside(lon, lat)) continue
      let hits = 1
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
        if (inside(lon + dx * LON_STEP / 4, lat + dy * LAT_STEP / 4)) hits++
      }
      const pixel = this.pixel(square)
      if (!pixel.samples) pixel.land = Math.max(pixel.land ?? 0, 0.35 * hits / 5)
    }
  }

  bytes(key: string) {
    const bytes = new Uint8Array(COLS * ROWS * 2)
    for (const [i, { land, samples }] of this.cells.get(key) ?? []) {
      if (!samples) {
        // Zoned land with no mapped footprint: built share only, levels 0 = unknown, no measured height.
        bytes[i * 2] = Math.round((land ?? 0) * 15) << 4
        continue
      }
      const { lat } = squareCentre({ cell: key, row: Math.floor(i / COLS), col: i % COLS })
      const area = samples.reduce((sum, sample) => sum + sample.area, 0)
      const share = Math.max(1, Math.min(15, Math.round(area / squareArea(lat) * 15)))
      samples.sort((a, b) => a.height - b.height)
      let cumulative = 0
      const median = samples.find(sample => (cumulative += sample.area) >= area / 2) ?? samples.at(-1)!
      bytes[i * 2] = (share << 4) | Math.min(15, Math.round(median.height / 3.2))
      bytes[i * 2 + 1] = Math.min(255, Math.round(samples[Math.ceil(samples.length * 0.9) - 1].height))
    }
    return bytes
  }
}

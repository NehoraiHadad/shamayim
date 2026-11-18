import { COLS, ROWS, LAT_STEP, LON_STEP, squareCentre, squareOf } from '../../src/data/city/grid'
import type { Square } from '../../src/data/city/types'
import { METRES, eastMetres, type Footprint } from './geometry'

export const squareArea = (lat: number) => LAT_STEP * LON_STEP * METRES * eastMetres(lat)
export const slot = ({ row, col }: Square) => row * COLS + col

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

// Preserve v1's centroid allocation and bounding-box approximation for large polygons.
export function distribute(shape: Footprint, add: (square: Square, area: number) => void) {
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

export class Cover {
  private areas = new Map<string, Float64Array>()

  add(shape: Footprint) {
    distribute(shape, (square, area) => {
      let cell = this.areas.get(square.cell)
      if (!cell) this.areas.set(square.cell, cell = new Float64Array(COLS * ROWS))
      cell[slot(square)] += area
    })
  }

  at(lat: number, lon: number) {
    const centre = squareCentre(squareOf(lat, lon))
    let area = 0, ground = 0
    // Nine whole angular squares. Longitude metres shrink by cos(latitude) in each row.
    for (let y = -1; y <= 1; y++) {
      const rowLat = centre.lat + y * LAT_STEP
      ground += 3 * squareArea(rowLat)
      for (let x = -1; x <= 1; x++) {
        const square = squareOf(rowLat, centre.lon + x * LON_STEP)
        area += this.areas.get(square.cell)?.[slot(square)] ?? 0
      }
    }
    return Math.min(1, area / ground)
  }
}

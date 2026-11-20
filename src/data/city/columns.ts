import { SCENE_CAMERA } from '../../domain/camera'
import type { Coordinate } from '../landmarks/project'
import { cellKey, COLS, LON_STEP, ROWS, squareCentre, strideFor } from './grid'
import type { CityColumns, CityTower, Column } from './types'

export const BAND_WIDTH = 375
export const COLUMN_WIDTH = 2
export const COLUMN_COUNT = Math.ceil(BAND_WIDTH / COLUMN_WIDTH)
const NORTH_KM = 111.32
const eastScale = (lat: number) => NORTH_KM * Math.cos(lat * Math.PI / 180)
export const depthRow = (dy: number): 0 | 1 | 2 => dy > .75 ? 0 : dy < -.75 ? 2 : 1

export function cityOffset(place: Coordinate, point: Coordinate) {
  return { dx: (point.lon - place.lon) * eastScale(place.lat), dy: (point.lat - place.lat) * NORTH_KM }
}

export function nearBand(place: Coordinate, depth = 3) {
  const half = 12 / eastScale(place.lat)
  return { west: place.lon - half, span: 2 * half, south: place.lat - depth / NORTH_KM, north: place.lat + depth / NORTH_KM }
}

export function cellsForBand(place: Coordinate, depth = 3) {
  const { west, span, south, north } = nearBand(place, depth)
  const [sy, sx] = cellKey(south, west).split('_').map(Number)
  const [ny, ex] = cellKey(north, west + span).split('_').map(Number)
  const cells: string[] = []
  for (let y = sy; y <= ny; y++) for (let x = sx; x <= ex; x++) cells.push(`${y}_${x}`)
  return cells
}

type Sum = Column & { count: number }
const makeRow = () => Array.from({ length: COLUMN_COUNT },
  (): Sum => ({ built: 0, measured: 0, levels: 0, upper: 0, count: 0 }))
/** Storeys assumed for zoned urban land with no mapped footprints (the builder's 3-level prior). */
const UNMEASURED_LEVELS = 3

export function computeColumns(place: Coordinate, grids: ReadonlyMap<string, Uint8Array>, towers: CityTower[] = []): CityColumns {
  const { west, span, south, north } = nearBand(place)
  const rows: [Sum[], Sum[], Sum[]] = [makeRow(), makeRow(), makeRow()]
  for (const cell of cellsForBand(place)) {
    const bytes = grids.get(cell)
    const stride = bytes ? strideFor(bytes) : 2
    for (let row = 0; row < ROWS; row++) {
      const { lat, lon: firstLon } = squareCentre({ cell, col: 0, row })
      if (lat < south || lat > north) continue
      const dy = (lat - place.lat) * NORTH_KM
      const depth = depthRow(dy)
      for (let col = 0; col < COLS; col++) {
        const lon = firstLon + col * LON_STEP
        // Across like the scene: east on the left when the scene faces south as an eye does (`SCENE_CAMERA`).
        const along = (lon - west) * BAND_WIDTH / span
        const x = SCENE_CAMERA.handed === 1 ? BAND_WIDTH - along : along
        if (x < 0 || x >= BAND_WIDTH) continue
        const bin = rows[depth][Math.floor(x / COLUMN_WIDTH)]
        const i = (row * COLS + col) * stride
        const meta = bytes?.[i] ?? 0
        const share = (meta >> 4) / 15
        bin.count++
        bin.built += share
        if (meta & 15) {
          bin.measured += share
          bin.levels += share * (meta & 15)
        }
        bin.upper = Math.max(bin.upper, bytes?.[i + 1] ?? 0)
      }
    }
  }
  const finish = (row: Sum[]) => row.map(({ built, measured, levels, upper, count }) => ({
    built: count ? built / count : 0, measured: count ? measured / count : 0,
    levels: measured ? levels / measured : built ? UNMEASURED_LEVELS : 0, upper,
  }))
  return { west, span, rows: [finish(rows[0]), finish(rows[1]), finish(rows[2])], towers }
}

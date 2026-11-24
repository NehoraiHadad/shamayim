import type { Run, Square } from './types'

export const COLS = 80
export const ROWS = 48
export const LON_STEP = 0.1 / COLS
export const LAT_STEP = 0.1 / ROWS
export const cellKey = (lat: number, lon: number) => `${Math.floor(lat * 10)}_${Math.floor(lon * 10)}`

const colOf = (lon: number) => Math.min(COLS - 1, Math.floor((lon * 10 - Math.floor(lon * 10)) * COLS))
const rowOf = (lat: number) => Math.min(ROWS - 1, Math.floor((lat * 10 - Math.floor(lat * 10)) * ROWS))

export const squareOf = (lat: number, lon: number): Square => ({ cell: cellKey(lat, lon), col: colOf(lon), row: rowOf(lat) })

/** Where a point's square stands among its cell's. */
export const squareIndex = (lat: number, lon: number) => rowOf(lat) * COLS + colOf(lon)

export function squareCentre({ cell, col, row }: Square) {
  const [south, west] = cell.split('_').map(Number)
  return { lat: south / 10 + (row + 0.5) * LAT_STEP, lon: west / 10 + (col + 0.5) * LON_STEP }
}

export const strideFor = (bytes: Uint8Array) => bytes.length === ROWS * COLS * 3 ? 3 : 2

export function encodeRuns(bytes: Uint8Array, stride: 2 | 3 = strideFor(bytes)): Run[] {
  const runs: Run[] = []
  for (let row = 0; row < ROWS; row++) {
    let col = 0
    while (col < COLS) {
      const start = col
      const offset = (row * COLS + start) * stride
      if (!(bytes[offset] || bytes[offset + 1] || (stride === 3 && bytes[offset + 2]))) {
        col++
        continue
      }
      let raw = ''
      while (col < COLS) {
        const i = (row * COLS + col) * stride
        if (!(bytes[i] || bytes[i + 1] || (stride === 3 && bytes[i + 2]))) break
        for (let j = 0; j < stride; j++) raw += String.fromCharCode(bytes[i + j])
        col++
      }
      runs.push([row, start, btoa(raw)])
    }
  }
  return runs
}

export function decodeRuns(runs: Run[], stride: 2 | 3 = 2): Uint8Array {
  const bytes = new Uint8Array(ROWS * COLS * stride)
  for (const [row, col, encoded] of runs) {
    const raw = atob(encoded)
    if (!Number.isInteger(row) || row < 0 || row >= ROWS || !Number.isInteger(col) || col < 0 ||
      raw.length % stride || col + raw.length / stride > COLS) throw new Error('Invalid city grid run')
    bytes.set(Uint8Array.from(raw, c => c.charCodeAt(0)), (row * COLS + col) * stride)
  }
  return bytes
}

/** Stable source-square identity used by town support and landmark placement. */
export const squareKey = ({ cell, col, row }: import('./types').Square) => `${cell}:${col}:${row}`

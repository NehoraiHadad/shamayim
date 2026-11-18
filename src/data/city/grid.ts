import type { Run, Square } from './types'

export const COLS = 80
export const ROWS = 48
export const LON_STEP = 0.1 / COLS
export const LAT_STEP = 0.1 / ROWS
export const cellKey = (lat: number, lon: number) => `${Math.floor(lat * 10)}_${Math.floor(lon * 10)}`

export function squareOf(lat: number, lon: number): Square {
  const cell = cellKey(lat, lon)
  return {
    cell,
    col: Math.min(COLS - 1, Math.floor((lon * 10 - Math.floor(lon * 10)) * COLS)),
    row: Math.min(ROWS - 1, Math.floor((lat * 10 - Math.floor(lat * 10)) * ROWS)),
  }
}

export function squareCentre({ cell, col, row }: Square) {
  const [south, west] = cell.split('_').map(Number)
  return { lat: south / 10 + (row + 0.5) * LAT_STEP, lon: west / 10 + (col + 0.5) * LON_STEP }
}

export function encodeRuns(bytes: Uint8Array): Run[] {
  const runs: Run[] = []
  for (let row = 0; row < ROWS; row++) {
    let col = 0
    while (col < COLS) {
      const start = col
      const offset = (row * COLS + start) * 2
      if (!(bytes[offset] || bytes[offset + 1])) {
        col++
        continue
      }
      let raw = ''
      while (col < COLS) {
        const i = (row * COLS + col) * 2
        if (!(bytes[i] || bytes[i + 1])) break
        raw += String.fromCharCode(bytes[i], bytes[i + 1])
        col++
      }
      runs.push([row, start, btoa(raw)])
    }
  }
  return runs
}

export function decodeRuns(runs: Run[]): Uint8Array {
  const bytes = new Uint8Array(ROWS * COLS * 2)
  for (const [row, col, encoded] of runs) {
    const raw = atob(encoded)
    if (!Number.isInteger(row) || row < 0 || row >= ROWS || !Number.isInteger(col) || col < 0 ||
      raw.length % 2 || col + raw.length / 2 > COLS) throw new Error('Invalid city grid run')
    bytes.set(Uint8Array.from(raw, c => c.charCodeAt(0)), (row * COLS + col) * 2)
  }
  return bytes
}

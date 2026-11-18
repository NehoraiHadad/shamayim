import { describe, expect, it } from 'vitest'
import { cellsForStrip } from '../landmarks/israelData'
import { SHADMOT_MEHOLA } from '../../config/place'
import { cellKey, COLS, decodeRuns, encodeRuns, ROWS, squareCentre, squareOf } from './grid'

describe('city grid', () => {
  it('round-trips sparse rows, including a run ending at the east edge', () => {
    const bytes = new Uint8Array(COLS * ROWS * 2)
    bytes.set([241, 255, 51, 42], (COLS - 2) * 2)
    bytes.set([97, 20], (COLS + 10) * 2)
    const runs = encodeRuns(bytes)
    expect(runs.map(([row, col]) => [row, col])).toEqual([[0, 78], [1, 10]])
    expect(decodeRuns(runs)).toEqual(bytes)
  })

  it('matches landmark keys and handles south and west of zero', () => {
    const { lat, lon } = SHADMOT_MEHOLA
    expect(cellsForStrip(SHADMOT_MEHOLA)).toContain(cellKey(lat, lon))
    expect(squareOf(-0.0001, -0.0001)).toEqual({ cell: '-1_-1', row: 47, col: 79 })
    expect(squareOf(32.1, 34.9)).toEqual({ cell: '321_349', row: 0, col: 0 })
  })

  it('maps square centres back to their grid coordinates', () => {
    for (const cell of ['320_348', '-5_-2']) {
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const centre = squareCentre({ cell, row, col })
        expect(squareOf(centre.lat, centre.lon)).toEqual({ cell, row, col })
      }
    }
  })
})

it('preserves all three bytes across runs and row boundaries', () => {
  const bytes = new Uint8Array(ROWS * COLS * 3)
  bytes.set([255, 255, 255, 0, 0, 128], (COLS - 1) * 3)
  const runs = encodeRuns(bytes, 3)
  expect(runs.map(([row, col]) => [row, col])).toEqual([[0, COLS - 1], [1, 0]])
  expect(decodeRuns(runs, 3)).toEqual(bytes)
})

import { expect, it } from 'vitest'
import { cellsForBand, computeColumns } from './columns'
import { COLS, ROWS, squareCentre } from './grid'

it('projects a westward stripe, includes empty squares, and splits the depth bands', () => {
  const place = { lat: 32.0505, lon: 34.86 }
  const grids = new Map<string, Uint8Array>()
  for (const cell of cellsForBand(place)) {
    const bytes = new Uint8Array(COLS * ROWS * 2)
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const { lat, lon } = squareCentre({ cell, row, col })
      const dy = (lat - place.lat) * 111.32
      const dx = (lon - place.lon) * 111.32 * Math.cos(place.lat * Math.PI / 180)
      if (dx < -5 || dx > -2 || Math.abs(dy) > 3) continue
      const levels = dy > .75 ? 4 : dy < -.75 ? 6 : 5
      if (levels === 4 && row % 2 === 0) continue
      bytes.set([(15 << 4) | levels, levels * 4], (row * COLS + col) * 2)
    }
    grids.set(cell, bytes)
  }
  const { rows } = computeColumns(place, grids)
  expect(rows.map(row => row.length)).toEqual([188, 188, 188])
  for (const [depth, row] of rows.entries()) {
    const built = row.flatMap((bin, index) => bin.built > 0 ? [index * 2 + 1] : [])
    // East on the left: the westward stripe lies right of the middle (the old 109–157, mirrored over 376 px).
    expect(Math.min(...built)).toBeGreaterThanOrEqual(376 - 157)
    expect(Math.min(...built)).toBeLessThanOrEqual(376 - 153)
    expect(Math.max(...built)).toBeGreaterThanOrEqual(376 - 113)
    expect(Math.max(...built)).toBeLessThanOrEqual(376 - 109)
    const bin = row[187 - 65]
    expect(bin.built).toBeCloseTo(depth === 0 ? .5 : 1, 1)
    expect(bin.levels).toBeCloseTo(depth + 4)
    expect(bin.upper).toBe((depth + 4) * 4)
    expect(bin.measured).toBeCloseTo(bin.built)
  }
})

it('keeps zoned land without footprints apart from measured fabric', () => {
  const place = { lat: 32.0505, lon: 34.86 }
  const grids = new Map(cellsForBand(place).map(cell => [cell, new Uint8Array(COLS * ROWS * 2).fill(9 << 4)]))
  const bin = computeColumns(place, grids).rows[1][90]
  expect(bin.built).toBeCloseTo(.6)
  expect(bin.measured).toBe(0)
  expect(bin.levels).toBe(3)
})

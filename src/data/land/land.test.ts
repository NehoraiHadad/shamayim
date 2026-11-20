import { describe, expect, it } from 'vitest'
import { decodeLand, encodeLand, LAND_N } from './grid'
import type { LandColour } from './satellite'
import { colourAt, REACH_M, STEP_M } from './satellite'
import { toUtm } from './utm'

describe('land', () => {
  it('runs round-trip', () => {
    const grid = new Uint8Array(LAND_N * LAND_N).map((_, i) => (i >> 7) % 11)
    expect(decodeLand(encodeLand(grid))).toEqual(grid)
  })

  it('UTM matches an independent series (Snyder) at Jerusalem, zone 36N', () => {
    const { e, n } = toUtm(31.7683, 35.2137, 36)
    expect(e).toBeCloseTo(709_643.3, 0)
    expect(n).toBeCloseTo(3_516_886.8, 0)
  })

  it('reads the colour grid where the satellite saw it, and nothing outside', () => {
    const size = (2 * REACH_M) / STEP_M
    const rgb = new Uint8Array(size * size * 3)
    const centre = ((size / 2) * size + size / 2) * 3
    rgb.set([10, 200, 30], centre)
    const colour: LandColour = { date: '2026-11-15', fetchedAt: 0, lat: 32, lon: 35, size, rgb }
    expect(colourAt(colour, 32 - 1e-6, 35 + 1e-6)).toEqual([10, 200, 30])
    expect(colourAt(colour, 32.2, 35)).toBeNull()
  })
})

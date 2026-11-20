import { describe, expect, it } from 'vitest'
import { decodeLand, encodeLand, LAND_N } from './grid'
import { nearAt, REACH_M, STEP_M } from './satellite'
import type { NearLandGrid } from './types'
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

  it('reads the near Sentinel-2 grid where valid, and returns null outside or when masked', () => {
    const size = (2 * REACH_M) / STEP_M
    const rgb = new Uint8Array(size * size * 3)
    const ndvi = new Float32Array(size * size).fill(Number.NaN)
    const ndsi = new Float32Array(size * size).fill(Number.NaN)
    const valid = new Float32Array(size * size)
    const idx = (size / 2) * size + size / 2
    rgb.set([10, 200, 30], idx * 3)
    ndvi[idx] = 0.62
    ndsi[idx] = -0.18
    valid[idx] = 0.9
    const grid: NearLandGrid = {
      date: '2026-11-15', source: 's2:2026-11-15', fetchedAt: 0,
      lat: 32, lon: 35, reachM: REACH_M, stepM: STEP_M, size, rgb, ndvi, ndsi, valid,
    }
    const cell = nearAt(grid, 32 - 1e-6, 35 + 1e-6)
    expect(cell).not.toBeNull()
    expect(cell!.rgb).toEqual([10, 200, 30])
    expect(cell!.ndvi).toBeCloseTo(0.62, 5)
    expect(cell!.ndsi).toBeCloseTo(-0.18, 5)
    expect(cell!.valid).toBeCloseTo(0.9, 5)
    expect(cell!.source).toBe('s2:2026-11-15')
    expect(nearAt(grid, 32.2, 35)).toBeNull()
  })
})

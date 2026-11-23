import { describe, expect, it } from 'vitest'
import { decodeLand, encodeLand, LAND_N } from './grid'
import { nearAt, nearCellCenter } from './nearGrid'
import { REACH_M, STEP_M } from './satellite'
import type { NearLandGrid } from './types'
import { fromUtm, toUtm, utmZoneOf } from './utm'

describe('land', () => {
  it('runs round-trip', () => {
    const grid = new Uint8Array(LAND_N * LAND_N).map((_, i) => (i >> 7) % 11)
    expect(decodeLand(encodeLand(grid))).toEqual(grid)
  })

  it('UTM forward and inverse match Snyder and round-trip in both hemispheres', () => {
    const { e, n } = toUtm(31.7683, 35.2137, 36)
    expect(e).toBeCloseTo(709_643.3, 0)
    expect(n).toBeCloseTo(3_516_886.8, 0)
    const backN = fromUtm(e, n, 36, false)
    expect(backN.lat).toBeCloseTo(31.7683, 6)
    expect(backN.lon).toBeCloseTo(35.2137, 6)

    // Southern hemisphere (Cape Town, zone 34S)
    expect(utmZoneOf(18.4241)).toBe(34)
    const s = toUtm(-33.9249, 18.4241, 34, true)
    expect(s.n).toBeGreaterThan(6_000_000)
    const backS = fromUtm(s.e, s.n, 34, true)
    expect(backS.lat).toBeCloseTo(-33.9249, 6)
    expect(backS.lon).toBeCloseTo(18.4241, 6)
  })

  it('indexes near Sentinel-2 grid in native UTM without meridian-convergence drift', () => {
    const lat0 = 32.3465, lon0 = 35.5325
    const utmZone = utmZoneOf(lon0)
    const c = toUtm(lat0, lon0, utmZone, false)
    const size = (2 * REACH_M) / STEP_M
    const n = size * size
    const rgb = new Uint8Array(n * 3)
    const ndvi = new Float32Array(n).fill(Number.NaN)
    const ndsi = new Float32Array(n).fill(Number.NaN)
    const snow = new Float32Array(n).fill(Number.NaN)
    const valid = new Float32Array(n), rgbValid = new Float32Array(n)
    const ndviValid = new Float32Array(n), ndsiValid = new Float32Array(n)
    const acqIndex = new Uint8Array(n).fill(255)
    const ndviAcqIndex = new Uint8Array(n).fill(255)
    const ndsiAcqIndex = new Uint8Array(n).fill(255)
    const snowAcqIndex = new Uint8Array(n).fill(255)

    // Target a cell 4.5 km north of center (row 5, col 50) where ~1.36° convergence shifts true north ~107 m east.
    const row = 5, col = 50, idx = row * size + col
    rgb.set([10, 200, 30], idx * 3)
    ndvi[idx] = 0.62; ndsi[idx] = -0.18; snow[idx] = 0
    valid[idx] = 0.9; rgbValid[idx] = 0.9; ndviValid[idx] = 0.9; ndsiValid[idx] = 0.9
    acqIndex[idx] = 0; ndviAcqIndex[idx] = 0; ndsiAcqIndex[idx] = 0; snowAcqIndex[idx] = 0
    const grid: NearLandGrid = {
      date: '2026-11-15', source: 's2:2026-11-15', fetchedAt: 0,
      lat: lat0, lon: lon0, utmZone, utmSouth: false,
      originE: c.e - REACH_M, originN: c.n + REACH_M,
      reachM: REACH_M, stepM: STEP_M, size,
      rgb, ndvi, ndsi, snow, valid, rgbValid, ndviValid, ndsiValid,
      acquisitions: [{ date: '2026-11-15' }],
      acqIndex, ndviAcqIndex, ndsiAcqIndex, snowAcqIndex,
    }

    const pt = nearCellCenter(grid, row, col)
    const cell = nearAt(grid, pt.lat, pt.lon)
    expect(cell).not.toBeNull()
    expect(cell!.rgb).toEqual([10, 200, 30])
    expect(cell!.ndvi).toBeCloseTo(0.62, 5)
    expect(cell!.ndsi).toBeCloseTo(-0.18, 5)
    expect(cell!.snow).toBe(0)
    expect(cell!.source).toBe('s2:2026-11-15')
    expect(nearAt(grid, 32.8, 35.5)).toBeNull()
  })
})

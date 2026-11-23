import { describe, expect, it } from 'vitest'
import s2Fixture from '../../test/fixtures/land-s2-shadmot.json'
import { makeNearBuffers } from './nearGrid'
import { aggregatePatch, type GridTransform } from './s2Aggregate'
import { bandScalingOf, computeNdsi, computeNdvi, dnToReflectance, isValidScl, L2A_SCALE, PB04_OFFSET } from './s2Math'
import { projectPixelQuad, quadRectOverlapArea } from './s2Poly'
import { toUtm } from './utm'

const UNIT_GRID: GridTransform = { size: 1, originE: 700_000, originN: 3_500_100, stepM: 100, utmZone: 36, utmSouth: false }

describe('s2Math radiometry, BOA offset, SCL masking and area-weighted aggregation', () => {
  it('resolves BOA offset for pre-PB04, raw PB04, harmonized Earth Search COGs and rejects ambiguous metadata', () => {
    expect(bandScalingOf({ datetime: '2021-06-01T08:30Z', 's2:processing_baseline': '03.00' }))
      .toEqual({ scale: L2A_SCALE, offset: 0, nodata: 0 })
    expect(bandScalingOf({ datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13' }))
      .toEqual({ scale: L2A_SCALE, offset: PB04_OFFSET, nodata: 0 })
    expect(bandScalingOf({ datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': false }))
      .toEqual({ scale: L2A_SCALE, offset: PB04_OFFSET, nodata: 0 })
    expect(bandScalingOf(
      { datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': true },
      { scale: 0.0001, offset: -0.1, nodata: 0 },
    )).toEqual({ scale: 0.0001, offset: 0, nodata: 0 })
    expect(bandScalingOf(
      { datetime: '2026-11-15T08:30Z', 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': false },
      { scale: 0.0001, offset: 0, nodata: 0 },
    )).toBeNull()
    expect(bandScalingOf({ datetime: '2026-11-15T08:30Z' })).toBeNull()
    expect(bandScalingOf({ datetime: '2021-06-01T08:30Z', 's2:processing_baseline': '03.00' }, { offset: -0.1 })).toBeNull()
  })

  it('matches live harmonized COG values (sea DN 1..21, land 700, 1400/3600 -> 0.44) vs raw PB04 (0.7333)', () => {
    const harm = bandScalingOf(
      { datetime: '2026-11-15T08:31Z', 's2:processing_baseline': '05.13', 'earthsearch:boa_offset_applied': true },
      { scale: 0.0001, offset: -0.1, nodata: 0 },
    )!
    const rawPb04 = bandScalingOf({ datetime: '2026-11-15T08:31Z', 's2:processing_baseline': '05.13' })!
    expect(dnToReflectance(0, harm)).toBeNull()
    expect(dnToReflectance(1, harm)).toBeCloseTo(0.0001, 6); expect(dnToReflectance(21, harm)).toBeCloseTo(0.0021, 6)
    expect(dnToReflectance(700, harm)).toBeCloseTo(0.07, 5)
    expect(computeNdvi(1400, 3600, harm, harm)).toBeCloseTo(0.44, 5)
    expect(computeNdvi(1400, 3600, rawPb04, rawPb04)).toBeCloseTo(0.22 / 0.30, 5)
    expect(dnToReflectance(800, rawPb04)).toBe(0); expect(computeNdsi(7000, 1500, rawPb04, rawPb04)).toBeCloseTo(0.55 / 0.65, 5)
  })

  it('tracks per-measurement support independently, separates black RGB, band nodata, mixed snow and open water', () => {
    for (const c of [0, 1, 2, 3, 8, 9, 10]) expect(isValidScl(c)).toBe(false)
    for (const c of [4, 5, 6, 7, 11]) expect(isValidScl(c)).toBe(true)

    const harm = { scale: 0.0001, offset: 0, nodata: 0 }
    const out1 = makeNearBuffers(1)
    aggregatePatch({
      width: 2, height: 2, west: 700_000, north: 3_500_100, resX: 50, resY: 50, zone: 36, south: false, acqId: 0,
      visual: new Uint8Array(12),
      red: Uint16Array.from([1400, 1400, 9000, 1050]),
      nir: Uint16Array.from([3600, 3600, 9000, 1050]),
      scl: Uint8Array.from([11, 5, 9, 3]),
      redScale: harm, nirScale: harm,
    }, UNIT_GRID, out1)
    expect(out1.valid[0]).toBeCloseTo(0.5, 5)
    expect(out1.rgbValid[0]).toBe(0)
    expect(out1.ndviValid[0]).toBeCloseTo(0.5, 5)
    expect(out1.ndvi[0]).toBeCloseTo(0.44, 4)
    expect(out1.snow[0]).toBeCloseTo(0.5, 5)

    const out2 = makeNearBuffers(1)
    aggregatePatch({
      width: 2, height: 2, west: 700_000, north: 3_500_100, resX: 50, resY: 50, zone: 36, south: false, acqId: 0,
      visual: Uint8Array.from([80, 120, 60, 80, 120, 60, 80, 120, 60, 80, 120, 60]),
      red: Uint16Array.from([1400, 0, 0, 0]),
      nir: Uint16Array.from([3600, 3600, 3600, 3600]),
      scl: Uint8Array.from([4, 4, 4, 4]),
      redScale: harm, nirScale: harm,
    }, UNIT_GRID, out2)
    expect(out2.valid[0]).toBeCloseTo(1, 5)
    expect(out2.rgbValid[0]).toBeCloseTo(1, 5)
    expect(out2.ndviValid[0]).toBeCloseTo(0.25, 5)

    const out3 = makeNearBuffers(1)
    aggregatePatch({
      width: 2, height: 2, west: 700_000, north: 3_500_100, resX: 50, resY: 50, zone: 36, south: false, acqId: 0,
      green: Uint16Array.from([1200, 1200, 1200, 1200]),
      swir: Uint16Array.from([100, 100, 100, 100]),
      scl: Uint8Array.from([6, 6, 6, 6]),
      greenScale: harm, swirScale: harm,
    }, UNIT_GRID, out3)
    expect(out3.ndsi[0]).toBeGreaterThan(0.8)
    expect(out3.snow[0]).toBe(0)
  })

  it('produces uniform phase-independent support = 1.0 across 100 m cells at real 40 m overview spacing', () => {
    const grid: GridTransform = { size: 4, originE: 700_000, originN: 3_500_400, stepM: 100, utmZone: 36, utmSouth: false }
    const harm = { scale: 0.0001, offset: 0, nodata: 0 }
    // Patch shifted by 13 m east and 27 m north at 40 m spacing covering all 4×4 cells completely (12×12 pixels = 480 m)
    const w = 12, h = 12, n = w * h
    const visual = new Uint8Array(n * 3)
    for (let i = 0; i < n; i++) visual.set([90, 130, 70], i * 3)
    const out = makeNearBuffers(4)
    aggregatePatch({
      width: w, height: h, west: 700_000 - 27, north: 3_500_400 + 33, resX: 40, resY: 40, zone: 36, south: false, acqId: 0,
      scl: new Uint8Array(n).fill(4),
      visual,
      red: new Uint16Array(n).fill(1400),
      nir: new Uint16Array(n).fill(3600),
      redScale: harm, nirScale: harm,
    }, grid, out)
    // Center-binning previously alternated 0.64 and 1.00 across adjacent cells; area-weighting is 1.00 in every cell!
    for (let i = 0; i < 16; i++) {
      expect(out.valid[i]).toBeCloseTo(1, 5); expect(out.rgbValid[i]).toBeCloseTo(1, 5)
      expect(out.ndviValid[i]).toBeCloseTo(1, 5); expect(out.ndvi[i]).toBeCloseTo(0.44, 4)
    }
  })

  it('decodes the recorded conflicting-metadata Shadmot fixture accurately without double-subtracting BOA offset', () => {
    const f = s2Fixture
    const redScale = bandScalingOf(f.properties, f.bands.red.rasterBands[0])!
    const nirScale = bandScalingOf(f.properties, f.bands.nir.rasterBands[0])!
    expect(redScale.offset).toBe(0)
    const idx = f.bands.red.data.findIndex((dn, i) => dn > 0 && dn < 1000 && f.bands.scl.data[i] === 5)
    expect(idx).toBeGreaterThanOrEqual(0)
    const r = f.bands.red.data[idx], n = f.bands.nir.data[idx]
    expect(dnToReflectance(r, redScale)).toBeCloseTo(r * 0.0001, 6)
    expect(computeNdvi(r, n, redScale, nirScale)).toBeCloseTo((n - r) / (n + r), 5)
  })

  it('computes exact rotated polygon overlap across a UTM zone boundary (35N -> 36N at 45° N, 30° E)', () => {
    const c35 = toUtm(45.0, 30.0, 35, false), c36 = toUtm(45.0, 30.0, 36, false)
    const grid: GridTransform = { size: 2, originE: c36.e - 100, originN: c36.n + 100, stepM: 100, utmZone: 36, utmSouth: false }
    const w = 10, h = 10, n = w * h
    const out = makeNearBuffers(2)
    aggregatePatch({
      width: w, height: h, west: c35.e - 200, north: c35.n + 200, resX: 40, resY: 40, zone: 35, south: false, acqId: 0,
      scl: new Uint8Array(n).fill(4),
    }, grid, out)
    // Projected adjacent quads tile zone 36 with zero rotation gaps/overlaps -> uniform exact 1.000 support
    for (let i = 0; i < 4; i++) expect(out.valid[i]).toBeCloseTo(1, 4)

    // Single rotated 40 m pixel straddling the zone-36 cell edge matches exact quad-rect intersection area
    const q = projectPixelQuad(c35.e, c35.n, c35.e + 40, c35.n + 40, 35, false, 36, false)
    const exactArea = quadRectOverlapArea(q, c36.e, c36.e + 100, c36.n, c36.n + 100)
    const singleOut = makeNearBuffers(2)
    aggregatePatch({
      width: 1, height: 1, west: c35.e, north: c35.n + 40, resX: 40, resY: 40, zone: 35, south: false, acqId: 0,
      scl: Uint8Array.from([4]),
    }, grid, singleOut)
    expect(singleOut.valid[1]).toBeCloseTo(exactArea / 10_000, 6)
    expect(exactArea).toBeLessThan(1600) // ~4.24° rotation slices corners off the cell boundary
  })
})

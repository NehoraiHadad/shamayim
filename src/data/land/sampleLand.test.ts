import { describe, expect, it, vi } from 'vitest'
import { encodeLand } from './grid'
import { coarseCoverFromJson, combineLandCovers } from './landData'
import { computeCoverMeans, MIN_CELL_VALID, sampleLandAt } from './sampleLand'
import type { FarLandGrid, LandData, NearLandGrid, RecentLandWeather } from './types'
import { toUtm, utmZoneOf } from './utm'

function makeNear(opts: {
  validFrac?: number; rgbValid?: number; ndviValid?: number; ndsi?: number; snow?: number
} = {}): NearLandGrid {
  const lat = 32.35, lon = 35.53, size = 20, reachM = 5000, stepM = 500
  const utmZone = utmZoneOf(lon), c = toUtm(lat, lon, utmZone, false)
  const n = size * size
  const rgb = new Uint8Array(n * 3)
  const ndvi = new Float32Array(n)
  const ndsi = new Float32Array(n)
  const snow = new Float32Array(n)
  const valid = new Float32Array(n), rgbValid = new Float32Array(n)
  const ndviValid = new Float32Array(n), ndsiValid = new Float32Array(n)
  const acqIndex = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    rgb.set([95, 132, 68], i * 3)
    ndvi[i] = 0.52
    ndsi[i] = opts.ndsi ?? -0.2
    snow[i] = opts.snow ?? 0
    valid[i] = opts.validFrac ?? 0.9
    rgbValid[i] = opts.rgbValid ?? (opts.validFrac ?? 0.9)
    ndviValid[i] = opts.ndviValid ?? (opts.validFrac ?? 0.9)
    ndsiValid[i] = opts.validFrac ?? 0.9
  }
  return {
    date: '2026-11-15', source: 's2:2026-11-15', fetchedAt: 0,
    lat, lon, utmZone, utmSouth: false, originE: c.e - reachM, originN: c.n + reachM,
    reachM, stepM, size, rgb, ndvi, ndsi, snow, valid, rgbValid, ndviValid, ndsiValid,
    acquisitions: [{ sunElevation: 38, sunAzimuth: 165 }], acqIndex,
  }
}

function makeFar(withRgb: boolean): FarLandGrid {
  const size = 20, reachKm = 60, stepKm = 6
  const ndvi = new Float32Array(size * size).fill(0.31)
  const rgb = withRgb ? new Uint8Array(size * size * 3) : undefined
  if (rgb) for (let i = 0; i < rgb.length; i += 3) rgb.set([150, 142, 110], i)
  return {
    date: '2026-11-18', source: 'gibs:2026-11-18', fetchedAt: 0,
    ...(withRgb ? { rgbDate: '2026-11-01', rgbSource: 'gibs:2026-11-01' as const, rgb } : {}),
    lat: 32.35, lon: 35.53, reachKm, stepKm, size, ndvi,
  }
}

const WEATHER: RecentLandWeather = {
  date: '2026-11-20', source: 'open-meteo:2026-11-20', fetchedAt: 0,
  precip14dMm: 12, precip30dMm: 22, precip60dMm: 35,
  precipCoverage14d: 1, precipCoverage30d: 1, precipCoverage60d: 1,
  snowfall14dCm: 0, daysSinceRain: 3, soilMoistureTop: 0.18, soilMoistureRoot: 0.22,
}

describe('sampleLandAt fallback chain, per-value dates, WorldCover coverage & laziness', () => {
  it('uses climatology when empty, represents unknown cover and missing NDSI explicitly', () => {
    const empty: LandData = { cover: null, near: null, far: null, weather: null }
    const s = sampleLandAt(empty, 32.35, 35.53, 11, -175)
    expect(s.cover).toBeNull()
    expect(s.rgbSource).toBe('climatology'); expect(s.rgbDate).toBeNull()
    expect(s.ndviSource).toBe('climatology'); expect(s.ndviDate).toBeNull()
    expect(s.ndsi).toBeNull(); expect(s.ndsiSource).toBeNull(); expect(s.ndsiDate).toBeNull()
    expect(s.drynessSource).toBe('climatology'); expect(s.drynessDate).toBeNull()
    expect(s.snowSource).toBe('climatology'); expect(s.snowDate).toBeNull()
  })

  it('ties independent observation dates to each resolved value in mixed near/far/mean/climatology samples', () => {
    const cover = { coverAt: () => 4 }
    const data: LandData = { cover, near: makeNear(), far: makeFar(true), weather: WEATHER }
    // 20 km north: far GIBS RGB (2026-11-01), far GIBS NDVI (2026-11-18), weather (2026-11-20), climatology snow, missing NDSI
    const s = sampleLandAt(data, 32.53, 35.53, 11, 200)
    expect(s.cover).toBe(4)
    expect(s.rgbSource).toBe('gibs:2026-11-01'); expect(s.rgbDate).toBe('2026-11-01')
    expect(s.ndviSource).toBe('gibs:2026-11-18'); expect(s.ndviDate).toBe('2026-11-18')
    expect(s.drynessSource).toBe('open-meteo:2026-11-20'); expect(s.drynessDate).toBe('2026-11-20')
    expect(s.ndsi).toBeNull(); expect(s.ndsiSource).toBeNull(); expect(s.ndsiDate).toBeNull()
    expect(s.snowSource).toBe('climatology'); expect(s.snowDate).toBeNull()
  })

  it('excludes unknown cover class 0 from cover means and resolves known far WorldCover via coarse footprint', () => {
    const near = makeNear()
    // Gap / unknown cover class 0 inside near window must NEVER populate byCover[0]
    const gapCover = { coverAt: (lat: number) => (lat > 32.35 ? 0 : 4) }
    const means = computeCoverMeans(near, gapCover)
    expect(means.byCover[0]).toBeUndefined()
    expect(means.byCover[4].rgb).toEqual([95, 132, 68])

    // Gap point outside near window gets cover: null and does NOT match s2-mean
    const gapSample = sampleLandAt({ cover: gapCover, near, far: null, weather: null }, 32.55, 35.53, 11, 100)
    expect(gapSample.cover).toBeNull()
    expect(gapSample.rgbSource).toBe('climatology')

    // Combined near + coarse ±60 km WorldCover preserves class 4 at a far point 25 km away -> s2-mean RGB fallback works!
    const coarseGrid = new Uint8Array(100 * 100).fill(4)
    const coarse = coarseCoverFromJson({ v: 1, bbox: [32.0, 35.0, 33.0, 36.0], stepDeg: 0.01, rows: 100, cols: 100, r: encodeLand(coarseGrid) })
    const nearOnly = { coverAt: (lat: number) => (Math.abs(lat - 32.35) < 0.05 ? 4 : 0) }
    const combined = combineLandCovers(nearOnly, coarse)!
    const farSample = sampleLandAt({ cover: combined, near, far: makeFar(false), weather: null }, 32.58, 35.53, 11, 200)
    expect(farSample.cover).toBe(4)
    expect(farSample.rgbSource).toBe('s2-mean:2026-11-15')
    expect(farSample.rgbDate).toBe('2026-11-15')
    expect(farSample.ndviSource).toBe('gibs:2026-11-18')
  })

  it('uses observed SCL-11 snow fraction near, never exports snow via cover means, and keeps water snow-free', () => {
    const cover = { coverAt: () => 6 }
    // Near high-elevation snowy window (snow=0.7) -> near cell reports 0.7, distant warm lowland falls back to climatology (0)
    const snowyNear = makeNear({ ndsi: 0.65, snow: 0.7 })
    const data: LandData = { cover, near: snowyNear, far: null, weather: null }
    const nearPt = sampleLandAt(data, 32.35, 35.53, 1, 1800)
    expect(nearPt.snowProb).toBeCloseTo(0.7, 4)
    expect(nearPt.snowSource).toBe('s2:2026-11-15')
    expect(nearPt.snowDate).toBe('2026-11-15')

    const distantWarm = sampleLandAt(data, 32.65, 35.53, 1, 50)
    expect(distantWarm.snowProb).toBeLessThan(0.05) // elevation-aware climatology, NOT near window's 0.7!
    expect(distantWarm.snowSource).toBe('climatology')
    expect(distantWarm.snowDate).toBeNull()

    // Open water cell with high NDSI (0.8) but SCL-11 snow=0 stays snowProb=0
    const waterNear = makeNear({ ndsi: 0.8, snow: 0 })
    const waterPt = sampleLandAt({ cover: { coverAt: () => 8 }, near: waterNear, far: null, weather: null }, 32.35, 35.53, 1, 0)
    expect(waterPt.snowProb).toBe(0)
  })

  it('lets RGB and NDVI fall back independently and skips cover-mean scans when near S2 resolves directly', () => {
    // Independent fallback: black RGB (rgbValid = 0) falls back to GIBS while NDVI stays s2
    const blackRgb = makeNear({ rgbValid: 0, ndviValid: 0.9 })
    const s = sampleLandAt({ cover: { coverAt: () => 4 }, near: blackRgb, far: makeFar(true), weather: WEATHER }, 32.35, 35.53, 11, 0)
    expect(s.rgbSource).toBe('gibs:2026-11-01')
    expect(s.ndviSource).toBe('s2:2026-11-15')

    // Lazy evaluation: direct near S2 + weather hit only calls cover.coverAt once (never runs the 400/2500-cell scan)
    const coverSpy = vi.fn(() => 4)
    const direct: LandData = { cover: { coverAt: coverSpy }, near: makeNear(), far: makeFar(true), weather: WEATHER }
    const hit = sampleLandAt(direct, 32.35, 35.53, 11, 0)
    expect(hit.rgbSource).toBe('s2:2026-11-15')
    expect(hit.ndviSource).toBe('s2:2026-11-15')
    expect(hit.snowSource).toBe('s2:2026-11-15')
    expect(hit.drynessSource).toBe('open-meteo:2026-11-20')
    expect(coverSpy).toHaveBeenCalledTimes(1)
    expect(MIN_CELL_VALID).toBe(0.2)
  })
})

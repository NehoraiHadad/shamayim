import { describe, expect, it, vi } from 'vitest'
import { encodeLand } from './grid'
import { computeCoverMeans, MIN_CELL_VALID, sampleLandAt } from './sampleLand'
import type { FarLandGrid, NearLandGrid, RecentLandWeather } from './types'
import { toUtm, utmZoneOf } from './utm'
import { coarseCoverFromJson, combineLandCovers } from './worldCoverGrid'

function makeNear(opts: {
  validFrac?: number; rgbValid?: number; ndviValid?: number; ndsi?: number; snow?: number
} = {}): NearLandGrid {
  const lat = 32.35, lon = 35.53, size = 20, reachM = 5000, stepM = 500
  const utmZone = utmZoneOf(lon), c = toUtm(lat, lon, utmZone, false)
  const n = size * size
  const rgb = new Uint8Array(n * 3), ndvi = new Float32Array(n), ndsi = new Float32Array(n), snow = new Float32Array(n)
  const valid = new Float32Array(n), rgbValid = new Float32Array(n), ndviValid = new Float32Array(n), ndsiValid = new Float32Array(n)
  const acqIndex = new Uint8Array(n), ndviAcqIndex = new Uint8Array(n), ndsiAcqIndex = new Uint8Array(n), snowAcqIndex = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    rgb.set([95, 132, 68], i * 3)
    ndvi[i] = 0.52; ndsi[i] = opts.ndsi ?? -0.2; snow[i] = opts.snow ?? 0
    valid[i] = opts.validFrac ?? 0.9
    rgbValid[i] = opts.rgbValid ?? (opts.validFrac ?? 0.9)
    ndviValid[i] = opts.ndviValid ?? (opts.validFrac ?? 0.9)
    ndsiValid[i] = opts.validFrac ?? 0.9
  }
  return {
    date: '2026-11-15', source: 's2:2026-11-15', fetchedAt: 0,
    lat, lon, utmZone, utmSouth: false, originE: c.e - reachM, originN: c.n + reachM,
    reachM, stepM, size, rgb, ndvi, ndsi, snow, valid, rgbValid, ndviValid, ndsiValid,
    acquisitions: [{ date: '2026-11-15', sunElevation: 38, sunAzimuth: 165 }],
    acqIndex, ndviAcqIndex, ndsiAcqIndex, snowAcqIndex,
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

describe('sampleLandAt fallback chain, per-value dates, decoupled cover means & laziness', () => {
  it('uses climatology when empty, represents unknown cover and missing NDSI explicitly', () => {
    const s = sampleLandAt({ cover: null, near: null, far: null, weather: null }, 32.35, 35.53, 11, -175)
    expect(s.cover).toBeNull()
    expect(s.rgbSource).toBe('climatology'); expect(s.rgbDate).toBeNull()
    expect(s.ndviSource).toBe('climatology'); expect(s.ndviDate).toBeNull()
    expect(s.ndsi).toBeNull(); expect(s.ndsiSource).toBeNull(); expect(s.ndsiDate).toBeNull()
    expect(s.drynessSource).toBe('climatology'); expect(s.snowSource).toBe('climatology')
  })

  it('ties independent observation dates to each resolved value in mixed near/far/mean/climatology samples', () => {
    const s = sampleLandAt({ cover: { coverAt: () => 4 }, near: makeNear(), far: makeFar(true), weather: WEATHER }, 32.53, 35.53, 11, 200)
    expect(s.cover).toBe(4)
    expect(s.rgbSource).toBe('gibs:2026-11-01'); expect(s.rgbDate).toBe('2026-11-01')
    expect(s.ndviSource).toBe('gibs:2026-11-18'); expect(s.ndviDate).toBe('2026-11-18')
    expect(s.drynessSource).toBe('open-meteo:2026-11-20'); expect(s.drynessDate).toBe('2026-11-20')
    expect(s.ndsi).toBeNull(); expect(s.snowSource).toBe('climatology')
  })

  it('decouples RGB and NDVI cover means so NDVI-only and RGB-only near grids both supply s2-mean fallbacks', () => {
    const cover = { coverAt: () => 4 }
    // 1. NDVI-only near grid (rgbValid = 0, ndviValid = 0.9) -> distant sample uses s2-mean NDVI + climatology RGB!
    const ndviOnly = makeNear({ rgbValid: 0, ndviValid: 0.9 })
    const ndviMeans = computeCoverMeans(ndviOnly, cover)
    expect(ndviMeans.byCover[4].rgb).toBeNull()
    expect(ndviMeans.byCover[4].ndvi).toBeCloseTo(0.52, 4)
    const farFromNdviOnly = sampleLandAt({ cover, near: ndviOnly, far: null, weather: null }, 32.60, 35.53, 11, 200)
    expect(farFromNdviOnly.ndviSource).toBe('s2-mean:2026-11-15')
    expect(farFromNdviOnly.ndvi).toBeCloseTo(0.52, 4)
    expect(farFromNdviOnly.rgbSource).toBe('climatology')

    // 2. RGB-only near grid (rgbValid = 0.9, ndviValid = 0) -> distant sample uses s2-mean RGB + climatology NDVI!
    const rgbOnly = makeNear({ rgbValid: 0.9, ndviValid: 0 })
    const farFromRgbOnly = sampleLandAt({ cover, near: rgbOnly, far: null, weather: null }, 32.60, 35.53, 11, 200)
    expect(farFromRgbOnly.rgbSource).toBe('s2-mean:2026-11-15')
    expect(farFromRgbOnly.rgb).toEqual([95, 132, 68])
    expect(farFromRgbOnly.ndviSource).toBe('climatology')

    // 3. Mixed: exclude unknown class 0; combined near + coarse preserves known far class 4
    const gapCover = { coverAt: (lat: number) => (lat > 32.35 ? 0 : 4) }
    expect(computeCoverMeans(makeNear(), gapCover).byCover[0]).toBeUndefined()
    const coarse = coarseCoverFromJson({ v: 1, bbox: [32.0, 35.0, 33.0, 36.0], stepDeg: 0.01, rows: 100, cols: 100, r: encodeLand(new Uint8Array(10_000).fill(4)) })
    const combined = combineLandCovers({ coverAt: (lat) => (Math.abs(lat - 32.35) < 0.05 ? 4 : 0) }, coarse)!
    const farSample = sampleLandAt({ cover: combined, near: makeNear(), far: makeFar(false), weather: null }, 32.58, 35.53, 11, 200)
    expect(farSample.rgbSource).toBe('s2-mean:2026-11-15')
    expect(farSample.ndviSource).toBe('gibs:2026-11-18')
  })

  it('uses SCL-11 snow near, never exports snow via cover means, keeps water snow-free and stays lazy on direct hits', () => {
    const snowyNear = makeNear({ ndsi: 0.65, snow: 0.7 })
    const nearPt = sampleLandAt({ cover: { coverAt: () => 6 }, near: snowyNear, far: null, weather: null }, 32.35, 35.53, 1, 1800)
    expect(nearPt.snowProb).toBeCloseTo(0.7, 4)
    expect(nearPt.snowSource).toBe('s2:2026-11-15')
    const distantWarm = sampleLandAt({ cover: { coverAt: () => 6 }, near: snowyNear, far: null, weather: null }, 32.65, 35.53, 1, 50)
    expect(distantWarm.snowProb).toBeLessThan(0.05)
    expect(distantWarm.snowSource).toBe('climatology')
    const waterPt = sampleLandAt({ cover: { coverAt: () => 8 }, near: makeNear({ ndsi: 0.8, snow: 0 }), far: null, weather: null }, 32.35, 35.53, 1, 0)
    expect(waterPt.snowProb).toBe(0)

    const coverSpy = vi.fn(() => 4)
    const hit = sampleLandAt({ cover: { coverAt: coverSpy }, near: makeNear(), far: makeFar(true), weather: WEATHER }, 32.35, 35.53, 11, 0)
    expect(hit.rgbSource).toBe('s2:2026-11-15')
    expect(hit.ndviSource).toBe('s2:2026-11-15')
    expect(coverSpy).toHaveBeenCalledTimes(1)
    expect(MIN_CELL_VALID).toBe(0.2)
  })

  it('reports exact contributing date range and conservative oldest date on mixed-date cover means regardless of scan order', () => {
    const cover = { coverAt: () => 4 }
    const makeMixed = (olderFirst: boolean) => {
      const g = makeNear()
      g.acquisitions = [{ date: '2026-11-15' }, { date: '2026-10-20' }]
      const n = g.size * g.size, half = n / 2
      for (let i = 0; i < n; i++) {
        // 50/50 split on RGB (order-flipped), 60/40 newer-majority split on NDVI
        g.acqIndex[i] = olderFirst ? (i < half ? 1 : 0) : (i < half ? 0 : 1)
        g.ndviAcqIndex[i] = i < n * 0.6 ? 0 : 1
      }
      return g
    }
    const mA = computeCoverMeans(makeMixed(true), cover).byCover[4]
    const mB = computeCoverMeans(makeMixed(false), cover).byCover[4]
    expect(mA.rgbDateRange).toEqual(['2026-10-20', '2026-11-15'])
    expect(mB.rgbDateRange).toEqual(['2026-10-20', '2026-11-15'])
    expect(mA.rgbDate).toBe('2026-10-20')
    expect(mB.rgbDate).toBe('2026-10-20') // scan-order independent conservative date on tie!
    expect(mA.ndviDateRange).toEqual(['2026-10-20', '2026-11-15'])
    expect(mA.ndviDate).toBe('2026-10-20') // never advertises newer modal date over 40% month-old cells!

    const far = sampleLandAt({ cover, near: makeMixed(false), far: null, weather: null }, 32.60, 35.53, 11, 200)
    expect(far.rgbSource).toBe('s2-mean:2026-10-20'); expect(far.rgbDate).toBe('2026-10-20')
    expect(far.ndviSource).toBe('s2-mean:2026-10-20'); expect(far.ndviDate).toBe('2026-10-20')
  })
})

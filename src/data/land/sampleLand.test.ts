import { describe, expect, it, vi } from 'vitest'
import { computeCoverMeans, MIN_CELL_VALID, prepareLandSampler } from './sampleLand'
import type { NearLandGrid } from './types'
import { toUtm, utmZoneOf } from './utm'

function makeNear(opts: { rgbValid?: number; ndviValid?: number } = {}): NearLandGrid {
  const lat = 32.35, lon = 35.53, size = 20, reachM = 5000, stepM = 500
  const utmZone = utmZoneOf(lon), c = toUtm(lat, lon, utmZone, false), n = size * size
  const rgb = new Uint8Array(n * 3), ndvi = new Float32Array(n).fill(0.52)
  const ndsi = new Float32Array(n).fill(-0.2), snow = new Float32Array(n).fill(0)
  for (let i = 0; i < n; i++) rgb.set([95, 132, 68], i * 3)
  return {
    date: '2026-11-15', source: 's2:2026-11-15', fetchedAt: 0,
    lat, lon, utmZone, utmSouth: false, originE: c.e - reachM, originN: c.n + reachM,
    reachM, stepM, size, rgb, ndvi, ndsi, snow,
    valid: new Float32Array(n).fill(0.9),
    rgbValid: new Float32Array(n).fill(opts.rgbValid ?? 0.9),
    ndviValid: new Float32Array(n).fill(opts.ndviValid ?? 0.9),
    ndsiValid: new Float32Array(n).fill(0.9),
    acquisitions: [{ date: '2026-11-15' }],
    acqIndex: new Uint8Array(n), ndviAcqIndex: new Uint8Array(n),
    ndsiAcqIndex: new Uint8Array(n), snowAcqIndex: new Uint8Array(n),
  }
}

describe('computeCoverMeans and prepareLandSampler', () => {
  it('decouples RGB and NDVI cover means, excludes unknown class 0 and evaluates means lazily', () => {
    const coverSpy = vi.fn(() => 4)
    const sampler = prepareLandSampler({ cover: { coverAt: coverSpy }, near: makeNear(), far: null, weather: null })
    expect(sampler.nearAt(32.35, 35.53)?.rgb).toEqual([95, 132, 68])
    expect(coverSpy).not.toHaveBeenCalled() // cover means are NOT scanned until coverMeanAt() is requested
    expect(sampler.coverMeanAt(4)?.mean.rgb).toEqual([95, 132, 68])
    expect(coverSpy).toHaveBeenCalled()

    const ndviOnly = computeCoverMeans(makeNear({ rgbValid: 0, ndviValid: 0.9 }), { coverAt: () => 4 })
    expect(ndviOnly.byCover[4].rgb).toBeNull()
    expect(ndviOnly.byCover[4].ndvi).toBeCloseTo(0.52, 4)

    const rgbOnly = computeCoverMeans(makeNear({ rgbValid: 0.9, ndviValid: 0 }), { coverAt: () => 4 })
    expect(rgbOnly.byCover[4].rgb).toEqual([95, 132, 68])
    expect(rgbOnly.byCover[4].ndvi).toBeNull()

    const gapCover = { coverAt: (lat: number) => (lat > 32.35 ? 0 : 4) }
    expect(computeCoverMeans(makeNear(), gapCover).byCover[0]).toBeUndefined()
    expect(MIN_CELL_VALID).toBe(0.2)
  })

  it('reports exact contributing date range and conservative oldest date on mixed-date cover means regardless of scan order', () => {
    const cover = { coverAt: () => 4 }
    const makeMixed = (olderFirst: boolean) => {
      const g = makeNear()
      g.acquisitions = [{ date: '2026-11-15' }, { date: '2026-10-20' }]
      const n = g.size * g.size, half = n / 2
      for (let i = 0; i < n; i++) {
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
    expect(mB.rgbDate).toBe('2026-10-20')
    expect(mA.ndviDateRange).toEqual(['2026-10-20', '2026-11-15'])
    expect(mA.ndviDate).toBe('2026-10-20')
  })
})

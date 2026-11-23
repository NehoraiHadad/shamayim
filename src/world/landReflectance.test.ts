import { describe, expect, it } from 'vitest'
import { farCellAt } from '../data/land/gibs'
import { makeFar, makeNear, SHADMOT } from '../test/livingLandFixtures'
import { FAR_GAIN_ASSUMED, farGainOf, farRgbToReflectance, MIN_GAIN_FAR_CELLS } from './landReflectance'

describe('landReflectance: distinct-far-cell calibration, date matching and radiometric support', () => {
  it('rejects overlap that collapses onto a single valid far cell even with 16+ near probes', () => {
    const near = makeNear({ date: '2026-11-05', size: 20, stepM: 500 })
    const far = makeFar({ date: '2026-11-15', rgbDate: '2026-11-01', size: 60, stepKm: 2 })
    // Zero out every far cell except the single center cell under SHADMOT (all ~16 near probes hit that 1 far cell)
    const center = farCellAt(far, SHADMOT.lat, SHADMOT.lon)!
    far.rgb!.fill(0)
    far.rgb!.set([140, 125, 95], center.idx * 3)

    const gain = farGainOf({ cover: null, near, far, weather: null }, '2026-11-15')
    expect(gain).toEqual(FAR_GAIN_ASSUMED)
    expect(gain.source).toBe('assumed-tci')
    expect(gain.cells).toBe(0)
  })

  it('rejects mismatched near/far dates, aged-out S2 dates and future composites', () => {
    const far = makeFar({ date: '2026-11-15', rgbDate: '2026-11-01', size: 60, stepKm: 2 }) // midpoint 2026-11-04.5

    // 1. Mismatched dates: S2 from Sep 20 (45.5 d before MOD09A1 midpoint > 21 d cap)
    const staleGap = farGainOf({ cover: null, near: makeNear({ date: '2026-09-20' }), far, weather: null }, '2026-11-15')
    expect(staleGap).toEqual(FAR_GAIN_ASSUMED)

    // 2. Aged-out S2 & far (150 d old on shownDate -> discarded by age blend)
    const expired = farGainOf({ cover: null, near: makeNear({ date: '2026-11-05' }), far, weather: null }, '2027-04-15')
    expect(expired).toEqual(FAR_GAIN_ASSUMED)

    // 3. Incomplete/future MOD09A1 composite (2026-11-01..2026-11-08 viewed on 2026-11-05)
    const futureFar = farGainOf({ cover: null, near: makeNear({ date: '2026-11-05' }), far, weather: null }, '2026-11-05')
    expect(futureFar).toEqual(FAR_GAIN_ASSUMED)
  })

  it('recovers a known multi-cell per-channel gain across distinct far cells with comparable dates', () => {
    // True linear BOA reflectance on near S2: R=0.17, G=0.14, B=0.084 -> TCI bytes [173, 143, 86]
    // Synthetic GIBS display with known gains [0.34, 0.28, 0.21]: unit = [0.5, 0.5, 0.4] -> bytes [128, 128, 102]
    const near = makeNear({ date: '2026-11-06', rgb: [173, 143, 86], size: 20, stepM: 500 })
    const far = makeFar({ date: '2026-11-15', rgbDate: '2026-11-01', rgb: [128, 128, 102], size: 60, stepKm: 2 })

    const gain = farGainOf({ cover: null, near, far, weather: null }, '2026-11-15')
    expect(gain.source).toBe('near-overlap')
    expect(gain.cells).toBeGreaterThanOrEqual(MIN_GAIN_FAR_CELLS)
    expect(gain.cells).toBeGreaterThanOrEqual(16) // ±5 km spans ~5×5 distinct 2 km far cells
    expect(gain.rgb[0]).toBeCloseTo((173 / 255) * 0.25 / (128 / 255), 3)
    expect(gain.rgb[1]).toBeCloseTo((143 / 255) * 0.25 / (128 / 255), 3)
    expect(gain.rgb[2]).toBeCloseTo((86 / 255) * 0.25 / (102 / 255), 3)

    const mapped = farRgbToReflectance([128, 128, 102], gain)
    expect(mapped[0]).toBeCloseTo((173 / 255) * 0.25, 4)
    expect(mapped[1]).toBeCloseTo((143 / 255) * 0.25, 4)
    expect(mapped[2]).toBeCloseTo((86 / 255) * 0.25, 4)
  })
})

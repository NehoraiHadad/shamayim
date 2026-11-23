import { describe, expect, it, vi } from 'vitest'
import { climatologyAt } from '../data/land/climatology'
import { encodeLand } from '../data/land/grid'
import type { LandData } from '../data/land/types'
import { coarseCoverFromJson, combineLandCovers } from '../data/land/worldCoverGrid'
import { destination } from '../data/terrain/panorama'
import { SCENE_CAMERA } from '../domain/camera'
import { makeNear, SHADMOT, SHADMOT_TERRAIN as terrain, typedCover } from '../test/livingLandFixtures'
import { blendLinearRgb, blendScalar, coverMeanWindow, TAU_DAYS } from './landAgeBlend'
import { livingLandOf } from './landLiving'
import { linearRgbToSrgb, tciRgbToReflectance } from './landRadiometry'

const sampleAt = (data: LandData, shownDate: string) =>
  livingLandOf({ lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate, camera: SCENE_CAMERA, terrain, data })

describe('livingLandOf s2-mean fallback, mixed-date withholding, snow isolation and laziness', () => {
  it('uses mixed-date s2-mean at out-of-near-range points with no GIBS on eligible days and withholds it before newest day', () => {
    const near = makeNear({ date: '2026-11-15', rgb: [96, 132, 68], ndvi: 0.56 })
    near.acquisitions = [{ date: '2026-11-15' }, { date: '2026-10-20' }]
    const n = near.size * near.size
    for (let i = 0; i < n; i++) {
      near.acqIndex[i] = i < n / 2 ? 0 : 1
      near.ndviAcqIndex[i] = i < n * 0.6 ? 0 : 1
    }
    const data: LandData = { cover: typedCover(4, 'worldcover-2021:regional-1km'), near, far: null, weather: null }

    // 1. Eligible day (2026-11-20 >= newest 2026-11-15): s2-mean wins at 20 km ray band, blended from conservative oldest date
    const eligible = sampleAt(data, '2026-11-20')
    const ray = eligible.rays[20]
    const far20 = ray.bands.find((b) => b.distanceM === 20_000)!
    expect(far20.sample.albedoSource).toBe('s2-mean:2026-10-20+climatology')
    expect(far20.sample.albedoDate).toBe('2026-10-20/2026-11-15')
    expect(far20.sample.ndviSource).toBe('s2-mean:2026-10-20+climatology')
    expect(far20.sample.ndviDate).toBe('2026-10-20/2026-11-15')
    expect(far20.sample.snowSource).toBe('climatology') // near snow never exported via cover means

    const pt20 = destination(SHADMOT.lat, SHADMOT.lon, 20, ray.azimuth)
    const clim = climatologyAt(pt20.lat, pt20.lon, far20.elevationM, 11, 4)
    const win = coverMeanWindow('2026-10-20', '2026-11-15')
    const expRgb = linearRgbToSrgb(blendLinearRgb(tciRgbToReflectance([96, 132, 68]), tciRgbToReflectance(clim.rgb), 's2-mean:2026-10-20', win, '2026-11-20', TAU_DAYS.albedo).rgb)
    const expNdvi = blendScalar(0.56, clim.ndvi, 's2-mean:2026-10-20', win, '2026-11-20', TAU_DAYS.ndvi).value
    for (let c = 0; c < 3; c++) expect(far20.sample.albedo[c]).toBeCloseTo(expRgb[c], 5)
    expect(far20.sample.ndvi).toBeCloseTo(expNdvi, 5)

    // 2. Before newest contributing day (2026-11-10 < 2026-11-15): mixed-date mean is withheld -> climatology
    const early = sampleAt(data, '2026-11-10')
    const early20 = early.rays[20].bands.find((b) => b.distanceM === 20_000)!
    expect(early20.sample.albedoSource).toBe('climatology')
    expect(early20.sample.albedoDate).toBeNull()
    expect(early20.sample.ndviSource).toBe('climatology')
    expect(early20.sample.ndviDate).toBeNull()
  })

  it('decouples RGB-only and NDVI-only s2-mean fallbacks and combines near + coarse cover at 20 km', () => {
    const coarse = coarseCoverFromJson({ v: 1, bbox: [31.5, 34.8, 33.0, 36.2], stepDeg: 0.01, rows: 150, cols: 140, r: encodeLand(new Uint8Array(21_000).fill(4)) })
    const combined = combineLandCovers({ coverAt: (lat) => (Math.abs(lat - SHADMOT.lat) < 0.05 ? 4 : 0) }, coarse)!

    const ndviOnly = makeNear({ date: '2026-11-15', ndvi: 0.52 })
    ndviOnly.rgbValid.fill(0)
    const resN = sampleAt({ cover: combined, near: ndviOnly, far: null, weather: null }, '2026-11-15')
    const bandN = resN.rays[20].bands.find((b) => b.distanceM === 20_000)!.sample
    expect(bandN.albedoSource).toBe('climatology')
    expect(bandN.ndviSource).toBe('s2-mean:2026-11-15')
    expect(bandN.ndvi).toBeCloseTo(0.52, 4)

    const rgbOnly = makeNear({ date: '2026-11-15', rgb: [95, 132, 68] })
    rgbOnly.ndviValid.fill(0)
    const resR = sampleAt({ cover: combined, near: rgbOnly, far: null, weather: null }, '2026-11-15')
    const bandR = resR.rays[20].bands.find((b) => b.distanceM === 20_000)!.sample
    expect(bandR.albedoSource).toBe('s2-mean:2026-11-15')
    expect(bandR.ndviSource).toBe('climatology')
  })

  it('keeps SCL-11 snow local, keeps water snow-free and avoids cover-mean scan on fresh near hits', () => {
    const snowyNear = makeNear({ date: '2026-11-15', snow: 0.75 })
    const res = sampleAt({ cover: typedCover(6, 'worldcover-2021:local-50m'), near: snowyNear, far: null, weather: null }, '2026-11-15')
    expect(res.own.snow).toBeCloseTo(0.75, 3)
    expect(res.own.snowSource).toBe('s2:2026-11-15')
    const far20 = res.rays[20].bands.find((b) => b.distanceM === 20_000)!.sample
    expect(far20.snowSource).toBe('climatology')
    expect(far20.snow).toBeLessThan(0.05)

    const waterNear = makeNear({ date: '2026-11-15', snow: 0 })
    const water = sampleAt({ cover: typedCover(8, 'worldcover-2021:local-50m'), near: waterNear, far: null, weather: null }, '2026-11-15')
    expect(water.own.snow).toBe(0)

    const coverSpy = vi.fn(() => 4)
    const nearOnly = makeNear({ date: '2026-11-15' })
    // With fresh near S2 + fresh far GIBS, coverMeanAt is never scanned across the 400-cell near grid
    const s = livingLandOf({
      lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate: '2026-11-15',
      camera: SCENE_CAMERA, terrain,
      data: { cover: { coverAt: coverSpy }, near: nearOnly, far: { date: '2026-11-15', source: 'gibs:2026-11-15', rgbDate: '2026-11-08', rgbSource: 'gibs:2026-11-08', fetchedAt: 0, lat: SHADMOT.lat, lon: SHADMOT.lon, reachKm: 60, stepKm: 6, size: 20, ndvi: new Float32Array(400).fill(0.3), rgb: new Uint8Array(1200).fill(120) }, weather: null },
    })
    expect(s.own.albedoSource).toBe('s2:2026-11-15')
    // Only 9 local + 41*10 ray samples = 419 direct cover lookups (no 400-cell coverMean scan!)
    expect(coverSpy).toHaveBeenCalledTimes(419)
  })
})

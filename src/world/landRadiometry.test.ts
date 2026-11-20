import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bandScalingOf, dnToReflectance, type StacItemProps } from '../data/land/s2Math'
import type { SceneTerrain } from '../data/terrain/terrain'
import { SCENE_CAMERA } from '../domain/camera'
import { makeNear, SHADMOT, SHADMOT_TERRAIN, typedCover } from '../test/livingLandFixtures'
import { livingLandOf } from './landLiving'
import {
  linearRgbToSrgb, linearToSrgb, S2_TCI_MAX_REFLECTANCE, tciByteToReflectance, tciRgbToReflectance,
} from './landRadiometry'

interface S2Fixture {
  properties: StacItemProps
  bands: {
    visual: { data: number[] }
    red: { data: number[]; rasterBands?: { scale?: number; offset?: number; nodata?: number }[] }
    green: { data: number[]; rasterBands?: { scale?: number; offset?: number; nodata?: number }[] }
  }
}

describe('landRadiometry: Sentinel-2 L2A TCI proxy error/saturation, sRGB OETF & no double topographic correction', () => {
  it('matches documented RMS error across TCI < 245 and TCI < 200 on the recorded Shadmot PB 05.13 fixture', () => {
    const fx = JSON.parse(fs.readFileSync('src/test/fixtures/land-s2-shadmot.json', 'utf8')) as S2Fixture
    const redS = bandScalingOf(fx.properties, fx.bands.red.rasterBands?.[0])!
    const grnS = bandScalingOf(fx.properties, fx.bands.green.rasterBands?.[0])!
    let eR245 = 0, eG245 = 0, nR245 = 0, nG245 = 0
    let eR200 = 0, eG200 = 0, nR200 = 0, nG200 = 0, saturated = 0, maxRed = 0
    for (let i = 0; i < fx.bands.red.data.length; i++) {
      const vr = fx.bands.visual.data[i * 3], vg = fx.bands.visual.data[i * 3 + 1]
      const rTrue = dnToReflectance(fx.bands.red.data[i], redS)
      const gTrue = dnToReflectance(fx.bands.green.data[i], grnS)
      if (vr > 0 && rTrue !== null) {
        if (rTrue > maxRed) maxRed = rTrue
        if (vr >= 255) saturated++
        if (vr < 245) { eR245 += (tciByteToReflectance(vr) - rTrue) ** 2; nR245++ }
        if (vr < 200 && rTrue < 0.2) { eR200 += (tciByteToReflectance(vr) - rTrue) ** 2; nR200++ }
      }
      if (vg > 0 && gTrue !== null) {
        if (vg < 245) { eG245 += (tciByteToReflectance(vg) - gTrue) ** 2; nG245++ }
        if (vg < 200 && gTrue < 0.2) { eG200 += (tciByteToReflectance(vg) - gTrue) ** 2; nG200++ }
      }
    }
    const rmsR245 = Math.sqrt(eR245 / nR245), rmsG245 = Math.sqrt(eG245 / nG245)
    expect(nR245).toBeGreaterThan(100); expect(nG245).toBeGreaterThan(100)
    // Measured RMS across all unsaturated bytes (TCI < 245): ~0.0111 red, ~0.0088 green
    expect(rmsR245).toBeGreaterThan(0.008); expect(rmsR245).toBeLessThan(0.013)
    expect(rmsG245).toBeGreaterThan(0.006); expect(rmsG245).toBeLessThan(0.011)
    // Darker interior subset (TCI < 200, rho < 0.20): < 0.005 RMS
    expect(Math.sqrt(eR200 / nR200)).toBeLessThan(0.005)
    expect(Math.sqrt(eG200 / nG200)).toBeLessThan(0.005)
    // Bright reflectance > 0.25 clips at TCI = 255 -> S2_TCI_MAX_REFLECTANCE (0.25)
    expect(maxRed).toBeGreaterThan(S2_TCI_MAX_REFLECTANCE)
    expect(saturated).toBeGreaterThanOrEqual(1)
    expect(tciByteToReflectance(0)).toBe(0)
    expect(tciByteToReflectance(255)).toBeCloseTo(S2_TCI_MAX_REFLECTANCE, 6)
    expect(tciRgbToReflectance([102, 153, 204])).toEqual([0.1, 0.15, 0.2])
  })

  it('encodes linear BOA reflectance to sRGB 0..1 using the exact IEC 61966-2-1 OETF', () => {
    expect(linearToSrgb(0)).toBe(0)
    expect(linearToSrgb(0.002)).toBeCloseTo(12.92 * 0.002, 6) // linear toe
    expect(linearToSrgb(0.25)).toBeCloseTo(1.055 * (0.25 ** (1 / 2.4)) - 0.055, 6)
    expect(linearToSrgb(1)).toBeCloseTo(1, 6)
    expect(linearRgbToSrgb([0.1, 0.15, 0.2])).toEqual([linearToSrgb(0.1), linearToSrgb(0.15), linearToSrgb(0.2)])
  })

  it('preserves operational Sen2Cor L2A reflectance unchanged across steep sunlit and shaded slopes', () => {
    const rawRgb: [number, number, number] = [135, 148, 92]
    const expectedAlbedo = linearRgbToSrgb(tciRgbToReflectance(rawRgb))
    const near = makeNear({ date: '2026-11-15', rgb: rawRgb })
    const data = { cover: typedCover(4, 'worldcover-2021:local-50m'), near, far: null, weather: null }

    const slope = Math.tan((20 * Math.PI) / 180) * 1000 // m per km (~364 m/km)
    const southFacing = { heightNear: (_dx: number, dy: number) => 200 + slope * dy } as unknown as SceneTerrain
    const northFacing = { heightNear: (_dx: number, dy: number) => 200 - slope * dy } as unknown as SceneTerrain

    for (const t of [SHADMOT_TERRAIN, southFacing, northFacing]) {
      const land = livingLandOf({
        lat: SHADMOT.lat, lon: SHADMOT.lon, elevationM: -175, shownDate: '2026-11-15',
        camera: SCENE_CAMERA, terrain: t, data,
      })
      expect(land.own.albedoSource).toBe('s2:2026-11-15')
      expect(land.own.albedo[0]).toBeCloseTo(expectedAlbedo[0], 6)
      expect(land.own.albedo[1]).toBeCloseTo(expectedAlbedo[1], 6)
      expect(land.own.albedo[2]).toBeCloseTo(expectedAlbedo[2], 6)
    }
  })
})

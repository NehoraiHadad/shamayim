import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bandScalingOf, dnToReflectance, type StacItemProps } from '../data/land/s2Math'
import type { SceneTerrain } from '../data/terrain/terrain'
import { SCENE_CAMERA, STORED_CAMERA } from '../domain/camera'
import {
  delightReflectance, linearRgbToSrgb, MAX_DELIGHT_GAIN, normalFromGradient,
  S2_TCI_MAX_REFLECTANCE, srgbBytesToLinear, tciByteToReflectance, tciRgbToReflectance,
} from './landDelight'
import { normalAtRay, normalFromLocal } from './landTerrainNormal'

interface S2Fixture {
  properties: StacItemProps
  bands: {
    visual: { data: number[] }
    red: { data: number[]; rasterBands?: { scale?: number; offset?: number; nodata?: number }[] }
    green: { data: number[]; rasterBands?: { scale?: number; offset?: number; nodata?: number }[] }
  }
}

describe('landDelight: Sentinel-2 TCI -> reflectance, sRGB round-trip and Lambertian de-lighting', () => {
  it('matches empirical B04 and B03 BOA reflectance in the recorded Shadmot S2 L2A PB 05.13 fixture', () => {
    const fx = JSON.parse(fs.readFileSync('src/test/fixtures/land-s2-shadmot.json', 'utf8')) as S2Fixture
    const redS = bandScalingOf(fx.properties, fx.bands.red.rasterBands?.[0])!
    const grnS = bandScalingOf(fx.properties, fx.bands.green.rasterBands?.[0])!
    let errR = 0, errG = 0, errR20 = 0, nR = 0, nG = 0
    for (let i = 0; i < fx.bands.red.data.length; i++) {
      const vr = fx.bands.visual.data[i * 3], vg = fx.bands.visual.data[i * 3 + 1]
      const rTrue = dnToReflectance(fx.bands.red.data[i], redS)
      const gTrue = dnToReflectance(fx.bands.green.data[i], grnS)
      if (vr > 0 && vr < 200 && rTrue !== null && rTrue < 0.2) {
        errR += (tciByteToReflectance(vr) - rTrue) ** 2
        errR20 += ((vr / 255) * 0.2 - rTrue) ** 2
        nR++
      }
      if (vg > 0 && vg < 200 && gTrue !== null && gTrue < 0.2) { errG += (tciByteToReflectance(vg) - gTrue) ** 2; nG++ }
    }
    expect(nR).toBeGreaterThan(50); expect(nG).toBeGreaterThan(50)
    // 0..0.25 linear stretch matches B04 & B03 to < 0.005 RMS on 40 m overview (vs > 0.025 for 0.20).
    expect(Math.sqrt(errR / nR)).toBeLessThan(0.005)
    expect(Math.sqrt(errG / nG)).toBeLessThan(0.005)
    expect(Math.sqrt(errR20 / nR)).toBeGreaterThan(0.025)
    expect(tciByteToReflectance(0)).toBe(0)
    expect(tciByteToReflectance(255)).toBeCloseTo(S2_TCI_MAX_REFLECTANCE, 6)
    expect(tciRgbToReflectance([102, 153, 204])).toEqual([0.1, 0.15, 0.2])
  })

  it('round-trips display sRGB bytes <-> linear reflectance via IEC 61966-2-1', () => {
    const sample: [number, number, number] = [64, 152, 236]
    const lin = srgbBytesToLinear(sample)
    expect(lin[0]).toBeCloseTo(0.0513, 3)
    expect(lin[2]).toBeCloseTo(0.8388, 3)
    const back = linearRgbToSrgb(lin)
    expect(back[0] * 255).toBeCloseTo(64, 4)
    expect(back[1] * 255).toBeCloseTo(152, 4)
    expect(back[2] * 255).toBeCloseTo(236, 4)
  })

  it('removes terrain illumination on sunlit/shaded slopes and clamps grazing self-shadowed faces', () => {
    const rho: [number, number, number] = [0.12, 0.10, 0.08]
    // Flat horizontal ground: cos(i) === cos(theta_z) -> exact identity
    const flat = delightReflectance(rho, 38, 180, normalFromGradient(0, 0))
    expect(flat.status).toBe('lambert'); expect(flat.factor).toBeCloseTo(1, 6); expect(flat.rho[0]).toBeCloseTo(0.12, 6)

    // South-facing 20 deg slope (height rises toward north: dz/dn = +tan 20) under southern sun (az 180, el 38):
    // incidence angle drops from 52 deg to 32 deg -> cos(i) = sin(58), cos(z) = sin(38) -> factor = sin(38)/sin(58) ≈ 0.726
    const slope20 = Math.tan((20 * Math.PI) / 180)
    const sunlit = delightReflectance(rho, 38, 180, normalFromGradient(0, slope20))
    const expectedSunlit = Math.sin((38 * Math.PI) / 180) / Math.sin((58 * Math.PI) / 180)
    expect(sunlit.status).toBe('lambert')
    expect(sunlit.factor).toBeCloseTo(expectedSunlit, 4)
    expect(sunlit.rho[0]).toBeCloseTo(0.12 * expectedSunlit, 5)

    // North-facing 20 deg slope (dz/dn = -tan 20) under southern sun: cos(i) = sin(18) -> factor ≈ 1.992 (lifted back up)
    const shaded = delightReflectance(rho, 38, 180, normalFromGradient(0, -slope20))
    const expectedShaded = Math.sin((38 * Math.PI) / 180) / Math.sin((18 * Math.PI) / 180)
    expect(shaded.status).toBe('lambert')
    expect(shaded.factor).toBeCloseTo(expectedShaded, 4)
    expect(shaded.rho[0]).toBeGreaterThan(rho[0])

    // Extreme cliff facing away from sun (cos(i) < 0): clamped cleanly to MAX_DELIGHT_GAIN = 2.0
    const cliff = delightReflectance(rho, 38, 180, normalFromGradient(0, -2.5))
    expect(cliff.status).toBe('lambert'); expect(cliff.factor).toBe(MAX_DELIGHT_GAIN)
  })

  it('skips de-lighting with explicit status when sun geometry, low sun or terrain normal is missing', () => {
    const rho: [number, number, number] = [0.15, 0.12, 0.09]
    const n = normalFromGradient(0.1, 0.2)
    expect(delightReflectance(rho, undefined, 165, n)).toMatchObject({ status: 'skipped-no-sun', factor: 1, rho })
    expect(delightReflectance(rho, 38, undefined, n)).toMatchObject({ status: 'skipped-no-sun', factor: 1, rho })
    expect(delightReflectance(rho, 3, 165, n)).toMatchObject({ status: 'skipped-low-sun', factor: 1, rho })
    expect(delightReflectance(rho, 38, 165, null)).toMatchObject({ status: 'skipped-no-normal', factor: 1, rho })
  })

  it('computes identical ENU terrain normals from local DEM and ray groundAt across camera handedness', () => {
    // Tilted plane z(eastKm, northKm) = 100 + 200 * eastKm - 100 * northKm -> dz/de = 0.2, dz/dn = -0.1
    const expected = normalFromGradient(0.2, -0.1)
    const planeTerrain = {
      heightNear: (dx: number, dy: number) => 100 + 200 * dx - 100 * dy,
    } as unknown as SceneTerrain
    const nLocal = normalFromLocal(planeTerrain, 0, 0)!
    expect(nLocal[0]).toBeCloseTo(expected[0], 5); expect(nLocal[1]).toBeCloseTo(expected[1], 5); expect(nLocal[2]).toBeCloseTo(expected[2], 5)

    const makeRayTerrain = (cam: typeof SCENE_CAMERA) => ({
      groundAt: (x: number, km: number) => {
        const az = ((cam.heading - (cam.handed * (cam.width / cam.pxPerDeg)) / 2 + cam.handed * (x / cam.pxPerDeg)) * Math.PI) / 180
        return 200 * (km * Math.sin(az)) - 100 * (km * Math.cos(az))
      },
    }) as unknown as SceneTerrain
    const nTrue = normalAtRay(makeRayTerrain(SCENE_CAMERA), SCENE_CAMERA, SCENE_CAMERA.width / 2, 10, 180)!
    const nMirror = normalAtRay(makeRayTerrain(STORED_CAMERA), STORED_CAMERA, STORED_CAMERA.width / 2, 10, 180)!
    for (const n of [nTrue, nMirror]) {
      expect(n[0]).toBeCloseTo(expected[0], 3)
      expect(n[1]).toBeCloseTo(expected[1], 3)
      expect(n[2]).toBeCloseTo(expected[2], 3)
    }
  })
})

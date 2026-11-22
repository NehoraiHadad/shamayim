import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../domain/camera'
import { skyLight } from '../theme/skyLight'
import { cloudFieldAt } from './cloudField'
import { lightOf, type LightInput } from './light'
import { FLAT_SKYLINE } from './skyline'
import type { AirInput } from '../atmo/airTypes'

it('dims the moon beam under a thin cirrostratus veil', () => {
  const at = '2026-11-17T00:00'
  const palette = skyLight({ altitude: -20, rising: false, cloudCover: 0, wet: 0, pm10: 0 })
  const body = { x: 120, y: 100, up: true, overLand: true, visible: 1 }
  const input: Omit<LightInput, 'covers'> = {
    at, day: undefined, site: { lat: 32, lon: 35, timezone: 'Asia/Jerusalem' },
    skyline: FLAT_SKYLINE, sunSkyline: FLAT_SKYLINE, palette, camera: SCENE_CAMERA,
    farFade: 0, aerosol: { visibilityKm: 30, dust: false },
    sun: { ...body, altitude: -20, azimuth: 0, visible: 0, t: null, clearance: -50 },
    moon: { ...body, altitude: 50, azimuth: 180, illumination: 1, tilt: 0, phase: 0.5 },
  }
  const clear = lightOf({ ...input, covers: { low: 0, mid: 0, high: 0 } })
  const covers = { low: 0, mid: 0, high: 0.85 }
  const cloudField = cloudFieldAt([], 'moon-veil', 0)(at, covers, { temperature: 17, humidity: 50, weatherCode: 0 } as AirInput,
    -20, { speedKmh: 0, fromDeg: 0 }, undefined)
  const veil = lightOf({ ...input, covers, cloudField })
  expect(veil.source).toBe('moon')
  expect(veil.meanBeam.moon).toBeLessThan(clear.meanBeam.moon)
  const dimmest = Math.min(...Array.from({ length: 18 }, (_, i) =>
    lightOf({ ...input, moon: { ...input.moon, azimuth: i * 20 }, covers, cloudField }).eye))
  expect(dimmest).toBeLessThan(clear.eye - 0.1)
})

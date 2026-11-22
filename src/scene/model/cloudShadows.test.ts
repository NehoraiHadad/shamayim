import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { layerSnapshot } from '../../world/field/density'
import { buildField } from '../../world/field/field'
import { cloudShadowLayers } from './cloudShadows'

it.each([5, 20, 45, 70])('emits shadows at the slant intersection at %s degrees', altitude => {
  const field = buildField({ placeId: 'shadow-test', at: '2026-11-17T12:00', hours: [],
    covers: { low: 0.45, mid: 0, high: 0 }, lowBaseKm: 1.1, elevationKm: 0, weatherCode: 0,
    sunAltitude: altitude, wind10: { speedKmh: 0, fromDeg: 0 } })
  const cot = 1 / Math.tan(altitude * Math.PI / 180)
  const snapshot = [layerSnapshot(field, 'low', 0, 0, 50)]
  for (const ground of [-0.3, 0.25]) {
    const world = { light: { azimuth: 90, altitude, direct: 0.8 }, camera: SCENE_CAMERA,
      cloudField: { field, snapshot }, terrain: {
        eyeM: 720,
        groundAt: (_x: number, km: number) => 720 + ground * 1000 + 5 * km,
        seenAt: (_x: number, km: number) => ({ groundY: 500 - km, y: 500 - km, angle: 0, groundAngle: 0 }),
      } }
    const box = { width: 375, dpr: 1 }
    cloudShadowLayers(world, box)
    const start = performance.now()
    const blobs = cloudShadowLayers(world, box)
    const elapsed = performance.now() - start
    expect(blobs.length).toBeGreaterThan(0)
    expect(blobs.length).toBeLessThanOrEqual(64)
    const byId = new Map(blobs.map(blob => [blob.id, blob]))
    let maxError = 0, count = 0
    for (const { id, x, y, baseKm: base, vKm: depth } of snapshot[0].cells) {
      const blob = byId.get(`cloudShadow.${id}`)
      if (!blob) continue
      count++
      const [sx, sy] = blob.centre
      const error = 1000 * Math.hypot(sx - (x - (base + depth / 2 - ground - 0.005 * Math.hypot(sx, sy)) * cot), sy - y)
      maxError = Math.max(error, maxError)
      expect(blob.blend).toBe('source-atop')
    }
    expect(count).toBe(blobs.length)
    expect(maxError).toBeLessThan(50)
    console.info({ altitude, ground, maxErrorM: maxError, shadowMs: elapsed })
    if (process.env.FIELD_PERF === '1') {
      const samples = Array.from({ length: 9 }, () => {
        const start = performance.now()
        cloudShadowLayers(world, box)
        return performance.now() - start
      }).sort((a, b) => a - b)
      expect(samples[4]).toBeLessThanOrEqual(1)
    }
  }
})

it('bounds the moving shadow pass relative to a terrain-work reference', () => {
  const field = buildField({ placeId: 'shadow-budget', at: '2026-11-17T12:00', hours: [],
    covers: { low: 0.65, mid: 0.2, high: 0 }, lowBaseKm: 1.1, elevationKm: 0.7, weatherCode: 0,
    sunAltitude: 20, wind10: { speedKmh: 15, fromDeg: 270 } })
  const snapshot = field.layers.map(({ lattice }) => layerSnapshot(field, lattice, 0, 0, 100))
  let groundCalls = 0
  const groundAt = (x: number, km: number) => {
    groundCalls++
    return 700 + 4 * km + Math.sin(x / 20) * 30
  }
  const moving = (minute: number) => cloudShadowLayers({
    light: { azimuth: 178 + minute * 0.15, altitude: 20 + minute * 0.05, direct: 0.8 }, camera: SCENE_CAMERA,
    cloudField: { field, snapshot }, terrain: { eyeM: 700, groundAt,
      seenAt: (_x, km) => ({ groundY: 500 - km, y: 500 - km, angle: 0, groundAngle: 0 }) },
  }, { width: 375, dpr: 1 })
  const median = (work: (minute: number) => unknown) => {
    for (let minute = 0; minute < 9; minute++) work(minute)
    const samples = Array.from({ length: 9 }, (_, i) => {
      const start = performance.now()
      work(i + 9)
      return performance.now() - start
    })
    return samples.sort((a, b) => a - b)[4]
  }
  const initial = moving(0)
  moving(1)
  const beforeRepeat = groundCalls
  expect(moving(0)).toEqual(initial)
  expect(groundCalls).toBe(beforeRepeat)
  groundCalls = 0
  const shadowMs = median(minute => moving(minute + 2))
  const shadowCalls = groundCalls / 18
  // Time the lower end of the old pass's measured query volume with the same
  // terrain sampler. Keep the result live so the reference cannot be optimized away.
  const referenceCalls = 41_000
  let checksum = 0
  const referenceMs = median(minute => {
    for (let i = 0; i < referenceCalls; i++) checksum += groundAt((i + minute) % 375, (i % 600) / 10)
  })
  const ratio = shadowMs / referenceMs
  expect(checksum).toBeGreaterThan(0)
  expect(shadowCalls).toBeLessThan(referenceCalls)
  console.info({ shadowMs, referenceMs, ratio, shadowCalls, terrainCallRatio: shadowCalls / referenceCalls })
  if (process.env.FIELD_PERF === '1') expect(shadowMs).toBeLessThanOrEqual(1)
  else expect(ratio).toBeLessThanOrEqual(1.5)
})

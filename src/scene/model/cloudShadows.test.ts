import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { visitCells } from '../../world/field/cells'
import { buildField } from '../../world/field/field'
import { cloudShadowLayers } from './cloudShadows'

it.each([5, 20, 45, 70])('emits shadows at the slant intersection at %s degrees', altitude => {
  const field = buildField({ placeId: 'shadow-test', at: '2026-11-17T12:00', hours: [],
    covers: { low: 0.45, mid: 0, high: 0 }, lowBaseKm: 1.1, elevationKm: 0, weatherCode: 0,
    sunAltitude: altitude, wind10: { speedKmh: 0, fromDeg: 0 } })
  const cot = 1 / Math.tan(altitude * Math.PI / 180)
  for (const ground of [-0.3, 0.25]) {
    const world = { light: { azimuth: 90, altitude, direct: 0.8 }, camera: SCENE_CAMERA,
      cloudField: { field, snapshot: [] }, terrain: {
        groundAt: () => ground * 1000,
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
    visitCells(field, 'low', 0, 0, 90, 0, (i, j, x, y, _r, base, depth) => {
      const blob = byId.get(`cloudShadow.low.${i}.${j}`)
      if (!blob) return
      count++
      const [sx, sy] = blob.centre
      const error = 1000 * Math.hypot(sx - (x - (base + depth / 2 - ground) * cot), sy - y)
      maxError = Math.max(error, maxError)
      expect(blob.blend).toBe('source-atop')
    })
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

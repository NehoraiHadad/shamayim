import { expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { layerSnapshot } from '../../world/field/density'
import { buildField } from '../../world/field/field'
import { cloudShadowLayers } from './cloudShadows'
import { shadowLayers } from './cloudShadowLayers'

it('describes the far ridge strip in land pixels even when a blob crosses both crests', () => {
  const near = { points: [[0, 40], [375, 40]] as [number, number][], distanceKm: [2, 2] }
  const far = { points: [[0, 20], [375, 20]] as [number, number][], distanceKm: [10, 10] }
  const box = { width: 750, landHeight: 128, dpr: 1 }
  const [layer] = shadowLayers({ horizonY: 60, near, far }, box, [{
    plane: 'far', km: 10, blob: { cellId: 1, centre: [0, 10], x: 375, y: 40, rx: 10, ry: 30, alpha: 0.5, speed: 0 },
  }])
  expect(layer.clip).toEqual({ crest: [[0, 20], [750, 20]], fronts: [[[0, 40], [750, 40]]] })
})

it.each([5, 20, 45, 70])('emits shadows at the slant intersection at %s degrees', altitude => {
  const field = buildField({ placeId: 'shadow-test', at: '2026-11-17T12:00', hours: [],
    covers: { low: 0.45, mid: 0, high: 0 }, lowBaseKm: 1.1, elevationKm: 0, weatherCode: 0,
    sunAltitude: altitude, wind10: { speedKmh: 0, fromDeg: 0 } })
  const cot = 1 / Math.tan(altitude * Math.PI / 180)
  const snapshot = [layerSnapshot(field, 'low', 0, 0, 50)]
  for (const ground of [-0.3, 0.25]) {
    const world = { light: { azimuth: 90, altitude, direct: 0.8 }, camera: SCENE_CAMERA,
      cloudField: { field, snapshot }, terrain: { horizonY: 500 }, flightTerrain: {
        eyeM: 720,
        heightAt: (eastKm: number, northKm: number) => 720 + ground * 1000 + 5 * Math.hypot(eastKm, northKm),
        blockedKm: () => null,
      } }
    const layers = cloudShadowLayers(world, { width: 375, landHeight: 128, dpr: 1 })
    expect(layers.map(layer => layer.id)).toEqual(['cloudShadow.near'])
    const blobs = layers.flatMap(layer => layer.blobs)
    expect(blobs.length).toBeGreaterThan(0)
    expect(blobs.length).toBeLessThanOrEqual(64)
    const byId = new Map(blobs.map(blob => [blob.cellId, blob]))
    let maxError = 0, count = 0
    for (const { id, x, y, baseKm: base, vKm: depth } of snapshot[0].cells) {
      const blob = byId.get(id)
      if (!blob) continue
      count++
      const [sx, sy] = blob.centre
      const error = 1000 * Math.hypot(sx - (x - (base + depth / 2 - ground - 0.005 * Math.hypot(sx, sy)) * cot), sy - y)
      maxError = Math.max(error, maxError)
      expect(blob.alpha).toBeGreaterThan(0)
    }
    expect(count).toBe(blobs.length)
    expect(maxError).toBeLessThanOrEqual(10)
  }
})

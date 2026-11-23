import { expect, it } from 'vitest'
import type { Plane, TerrainPlanes } from '../../world/types'
import { planeGeometryKey } from './planeGeometryKey'

it('keys changed geometry at the last packed vertex and in the independent material profile', () => {
  const near: Plane = { points: [[0, 25], [375, 25]], distanceKm: [2, 2] }
  const packed = new Float32Array([1, 2, 3, 4])
  const profile = { x: 20, crest: 25, points: [{ km: 1.4, y: 55, slope: 0.2, h: 15 }] }
  const landscape = { near, faces: { near: { columns: [profile] } } } as TerrainPlanes
  const original = planeGeometryKey(landscape, 'near', near, [packed])
  packed[3] = 4.004
  expect(planeGeometryKey(landscape, 'near', near, [packed])).not.toBe(original)
  packed[3] = 4
  profile.points[0].km = 1.401
  expect(planeGeometryKey(landscape, 'near', near, [packed])).not.toBe(original)
})

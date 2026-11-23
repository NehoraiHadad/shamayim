import { expect, it, vi } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { SCENE_W } from '../../world/sceneBox'
import type { Plane, TerrainPlanes, WorldState } from '../../world/types'
import { planeGeomOf } from './planeGeometry'
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

it('samples the back plane DEM once per column and gives both rows identical geometry', () => {
  const back: Plane = { points: [[0, 25], [SCENE_W, 25]], distanceKm: [2, 2] }
  const groundAt = vi.fn((x: number, km: number) => x + km)
  const terrain = { near: back, back, faces: {}, groundAt } as unknown as TerrainPlanes
  const world = { terrain, camera: SCENE_CAMERA } as WorldState
  const grid = planeGeomOf(world, 'back', back, 128)
  expect(grid.rows).toBe(2)
  // Each across-slope uses one DEM height on either side of its column.
  expect(groundAt).toHaveBeenCalledTimes(2 * grid.cols)
  for (const values of [grid.nx, grid.ny, grid.nz, grid.km]) {
    expect(values.slice(0, grid.cols)).toEqual(values.slice(grid.cols))
  }
})

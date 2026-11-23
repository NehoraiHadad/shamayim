import { describe, expect, it } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import { SCENE_W } from '../../world/sceneBox'
import type { Plane, WorldState } from '../../world/types'
import { planeGeomOf } from './planeGeometry'
import { receiverKm } from './receiverKm'

describe('painted ground receiver distance', () => {
  it('uses overlay depth only inside the overlay and interpolates the plane beneath it', () => {
    const near: Plane = { points: [[0, 40], [SCENE_W, 40]], distanceKm: [2, 2] }
    const world = {
      camera: SCENE_CAMERA,
      terrain: { near, far: { points: [], distanceKm: [] }, faces: {} },
      place3: { kind: 'outside', land: { km: 6, top: [[100, 50], [200, 50]], base: [[100, 80], [200, 80]] } },
    } as unknown as WorldState
    const box = { width: SCENE_W * 2, landHeight: 100, skyHeight: 428, landTop: 300, dpr: 1 }
    const at = receiverKm(world, box)
    const geom = planeGeomOf(world, 'near', near, box.landHeight)
    expect(at(150, 30)).toBe(Infinity)
    expect(at(150, 60)).toBe(6)
    expect(at(150, 100)).toBeCloseTo(geom.km.at(-1)!)
    expect(at(250, 60)).toBeLessThan(at(250, 40))
  })
})

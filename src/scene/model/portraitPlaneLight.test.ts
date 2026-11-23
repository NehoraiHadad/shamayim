import { describe, expect, it } from 'vitest'
import { azimuthAt, SCENE_CAMERA } from '../../domain/camera'
import { beyondKm } from '../../world/beyondSeat'
import { facesOf } from '../../world/face'
import { SCENE_W } from '../../world/sceneBox'
import type { TerrainPlanes, WorldState } from '../../world/types'
import { planeGeomOf } from './planeGeometry'

const points = [[0, 100], [SCENE_W, 100]] as const
const plane = { points: [...points], distanceKm: [1, 1] }
const frame = { centerX: SCENE_W / 2, eyeN: 8, f: 100, s: -2, n: 2 }
const baseKm = 2
const terrain = { near: plane, far: plane, faces: {}, groundAt: () => 0 } as unknown as TerrainPlanes

describe('portrait plane receivers', () => {
  it('uses portrait row distance for own ground, keeping the measured geometry', () => {
    const world = {
      terrain, camera: SCENE_CAMERA,
      place3: { kind: 'outside', frame, baseKm, nearLine: { own: [1, 1], baseY: (_dx: number, dy: number) => 150 + dy * 25 } },
    } as unknown as WorldState
    const grid = planeGeomOf(world, 'near', plane, 200)
    const center = grid.cols >> 1
    expect((grid.veilKm ?? grid.km)[center]).toBe(6)
    expect((grid.veilKm ?? grid.km)[(grid.rows - 1) * grid.cols + center]).toBe(2)
    expect(grid.km[center]).toBe(1)
  })

  it('transports a distant plane from the panorama eye to the portrait eye', () => {
    const world = {
      terrain, camera: SCENE_CAMERA, place3: { kind: 'outside', frame, baseKm, nearLine: null },
    } as unknown as WorldState
    const grid = planeGeomOf(world, 'back', plane, 200)
    const bearing = azimuthAt(0, world.camera) * Math.PI / 180
    expect((grid.veilKm ?? grid.km)[0]).toBeCloseTo(beyondKm(frame as Parameters<typeof beyondKm>[0], baseKm, Math.sin(bearing), Math.cos(bearing)))
  })

  it('keys a change in portrait depth even when the measured terrain is shared', () => {
    const world = {
      terrain, camera: SCENE_CAMERA, place3: { kind: 'outside', frame, baseKm, nearLine: null },
    } as unknown as WorldState
    if (world.place3.kind !== 'outside') throw new Error('Expected an outside view')
    const before = planeGeomOf(world, 'back', plane, 200)
    const moved = { ...world, place3: { ...world.place3, baseKm: baseKm + 1 } }
    const after = planeGeomOf(moved, 'back', plane, 200)
    expect(after.geomKey).not.toBe(before.geomKey)
    expect(after.km).toEqual(before.km)
  })

  it('uses the continuous own share at the seam', () => {
    const world = {
      terrain, camera: SCENE_CAMERA,
      place3: { kind: 'outside', frame, baseKm, nearLine: { own: [0, 1], baseY: (_dx: number, dy: number) => 150 + dy * 25 } },
    } as unknown as WorldState
    const grid = planeGeomOf(world, 'near', plane, 200)
    const center = grid.cols >> 1
    const azimuth = azimuthAt(.5, world.camera) * Math.PI / 180
    const beyond = beyondKm(frame as Parameters<typeof beyondKm>[0], baseKm, Math.sin(azimuth), Math.cos(azimuth))
    expect((grid.veilKm ?? grid.km)[center]).toBeCloseTo((beyond + 6) / 2)
  })

  it('maps measured terrain onto a portrait crest below the whole DEM face', () => {
    const faces = facesOf({
      near: plane, far: plane, groundAt: () => 0,
      sightAt: () => ({ nearKm: 1, farKm: 1, farShows: false }),
    }, angle => 60 - angle, true)
    expect(faces.near.columns.every(column => column.points.length > 0 && column.points[0].y === column.crest)).toBe(true)
    expect(faces.near.columns.at(0)?.points.at(-1)?.km).toBe(.4)
  })
})

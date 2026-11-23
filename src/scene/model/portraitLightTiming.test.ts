import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { SCENE_H, SCENE_W } from '../../world/sceneBox'
import { makeWorldBuilder } from '../../world/world'
import { sceneModel } from './index'
import { planeGeomOf } from './planeGeometry'

// Opt in on the same CI runner for alternating base and patched processes.
it.skipIf(!process.env.PORTRAIT_LIGHT_TIMING)('reports cold model and cold plane geometry timings', async () => {
  stubPublicFetch()
  try {
    const place = SCENE_PLACES.find(({ id }) => id === 'haifa')!
    const fixture = (await loadPlaces([place])).get(place.id)!
    const box = { width: SCENE_W, landHeight: SCENE_H, landTop: 300, skyHeight: 428, dpr: 1 }
    const modelCold: number[] = [], planeGeometry: number[] = []
    for (let run = 0; run < 12; run++) {
      const world = makeWorldBuilder()(worldInput(fixture, '2026-11-17T15:30'))
      expect(world.terrain.status).toBe('ready')
      const geometryWorld = { ...world, terrain: { ...world.terrain } }
      let started = performance.now()
      sceneModel(world, box)
      const modelMs = performance.now() - started
      started = performance.now()
      planeGeomOf(geometryWorld, 'near', geometryWorld.terrain.near, SCENE_H)
      planeGeomOf(geometryWorld, 'far', geometryWorld.terrain.far, SCENE_H)
      const geometryMs = performance.now() - started
      if (run < 2) continue // Warm up the JIT before recording cold cache samples.
      modelCold.push(modelMs)
      planeGeometry.push(geometryMs)
    }
    console.log(JSON.stringify({ place: place.id, modelCold, planeGeometry }))
  } finally {
    vi.unstubAllGlobals()
  }
}, 120_000)

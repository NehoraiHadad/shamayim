import { createHash } from 'node:crypto'
import { expect, it, vi } from 'vitest'
import { STILL_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { layersOn, sceneModel } from '.'
import type { SceneBox } from './types'
import { planeVegetationOf } from './landVegetation'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2.75 }

it('preserves the Nahalal vegetation descriptor and checks the cold crop budget when requested', async () => {
  stubPublicFetch()
  try {
    const place = STILL_PLACES.find((p) => p.id === 'nahalal')!
    const loaded = (await loadPlaces([place])).get(place.id)!
    const world = makeWorldBuilder()(worldInput(loaded, '2026-02-15T12:00'))
    const model = sceneModel(world, BOX)
    const near = layersOn(model, 'land').find((layer) => layer.kind === 'plane' && layer.plane === 'near')
    if (!near || near.kind !== 'plane') throw new Error('Missing near plane')
    expect(near.vegetation.rows.length).toBeGreaterThan(0)
    const build = (withCrops: boolean) => {
      // A new land identity forces the form cache to miss while retaining the same recorded inputs.
      const input = { ...world, land: { ...world.land }, cropAreas: withCrops ? world.cropAreas : [] }
      return planeVegetationOf(input, BOX, 'near', world.terrain.near, near.fill, model.clear)
    }
    // All packed positions, widths, weights and palette values from the prefilter's parent revision.
    expect(createHash('sha256').update(JSON.stringify(build(true))).digest('hex'))
      .toBe('02f962802194884e3abfeb176ea4b9f450240709fdca2f76daa0061d41b64a8f')
    // Run the millisecond gate separately from the parallel suite, whose CPU contention varies by host.
    if (process.env.SCENE_CHECK_NAHALAL_COLD !== '1') return

    const time = (withCrops: boolean) => {
      const start = performance.now()
      build(withCrops)
      return performance.now() - start
    }
    for (let i = 0; i < 20; i++) { time(true); time(false) }
    const deltas = [], crop = [], bare = []
    for (let i = 0; i < 30; i++) {
      const first = time(i % 2 === 0), second = time(i % 2 !== 0)
      const [withCrops, withoutCrops] = i % 2 === 0 ? [first, second] : [second, first]
      deltas.push(withCrops - withoutCrops)
      crop.push(withCrops)
      bare.push(withoutCrops)
    }
    const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    const overhead = median(deltas)
    console.log(`Nahalal cold near-plane median: ${median(bare).toFixed(2)} ms without crops, ${median(crop).toFixed(2)} ms with crops, ${overhead.toFixed(2)} ms paired overhead`)
    // Local regression budget from the recorded paired runs, with room for ordinary timing jitter.
    expect(overhead).toBeLessThan(12)
  } finally {
    vi.unstubAllGlobals()
  }
})

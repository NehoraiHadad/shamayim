import { createHash } from 'node:crypto'
import { expect, it, vi } from 'vitest'
import { STILL_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { layersOn, sceneModel } from '.'
import type { SceneBox } from './types'
import { planeVegetationOf } from './landVegetation'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2.75 }

it('preserves the Nahalal vegetation descriptor and bounds the relative cold crop overhead', async () => {
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
    // All packed positions, widths, weights and palette values. Re-pinned at the origin/main merge: track B's own-footprint
    // marks (a solar field at Nahalal) move the drawn near line, so the near plane's points and its rows moved with it.
    expect(createHash('sha256').update(JSON.stringify(build(true))).digest('hex'))
      .toBe('ec8dce628883f6f7c98cba03de37edf70e5af159e5765ff90d836736e27ae2bc')
    const time = (withCrops: boolean) => {
      const start = performance.now()
      build(withCrops)
      return performance.now() - start
    }
    for (let i = 0; i < 20; i++) { time(true); time(false) }
    const ratios = [], deltas = [], crop = [], bare = []
    for (let i = 0; i < 31; i++) {
      const first = time(i % 2 === 0), second = time(i % 2 !== 0)
      const [withCrops, withoutCrops] = i % 2 === 0 ? [first, second] : [second, first]
      deltas.push(withCrops - withoutCrops)
      ratios.push((withCrops - withoutCrops) / withoutCrops)
      crop.push(withCrops)
      bare.push(withoutCrops)
    }
    const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    const overhead = median(deltas)
    const relative = median(ratios)
    console.log(`Nahalal cold near-plane median: ${median(bare).toFixed(2)} ms without crops, ${median(crop).toFixed(2)} ms with crops, ${overhead.toFixed(2)} ms paired overhead (${relative.toFixed(2)}× bare)`)
    // Round 6 measured ~5 ms overhead on ~4 ms bare. Alternating pairs and the median absorb scheduling outliers.
    expect(relative).toBeLessThan(2.5)
  } finally {
    vi.unstubAllGlobals()
  }
})

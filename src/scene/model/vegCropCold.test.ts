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
    // Pin vegetation geometry independently of its palette (Finding 10) so palette updates cannot mask geometry changes.
    const veg = build(true)
    const { tones: _tones, ...geomOnly } = veg
    expect(createHash('sha256').update(JSON.stringify(geomOnly)).digest('hex'))
      .toBe('b49c38b10586a25359a187105f09b61defe740e9b9ade461c32cf8471169b38f')
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
    // Alternating pairs and the median absorb scheduling outliers. The overhead stayed ~7 ms across the origin/main merge,
    // but main made the bare build faster (3.9 → 3.1 ms), so the ratio rose from ~1.9× to ~2.3–2.6×. 3.5× still fails the
    // uncapped round-4 cost (~21 ms overhead on ~5 ms bare, ~4.3×).
    expect(relative).toBeLessThan(3.5)
  } finally {
    vi.unstubAllGlobals()
  }
})

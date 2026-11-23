import { expect, it, vi } from 'vitest'
import { STILL_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { layersOn, sceneModel } from '.'
import type { LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }

it('keeps Nahalal winter grass tufts when adjacent mapped orchards arrive', async () => {
  stubPublicFetch()
  try {
    const place = STILL_PLACES.find((p) => p.id === 'nahalal')!
    const loaded = (await loadPlaces([place])).get(place.id)!
    const build = makeWorldBuilder()
    const input = worldInput(loaded, '2026-02-15T12:00')
    const near = (world: ReturnType<typeof build>) => layersOn(sceneModel(world, BOX), 'land')
      .find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'near')!.vegetation
    const withoutCrops = near(build({ ...input, cropAreas: [] }))
    const withCrops = near(build(input))
    expect(withoutCrops.tufts.length).toBeGreaterThan(0)
    expect(withCrops.tufts).toEqual(withoutCrops.tufts)
    expect(withCrops.rows.length).toBeGreaterThan(0)
  } finally {
    vi.unstubAllGlobals()
  }
})

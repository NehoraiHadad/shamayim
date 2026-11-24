import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import type { WorldInput } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import type { SceneBox } from './types'
import { waterLayers } from './water'

/** The water mirrors the land drawn over its far shore, and that land moves as a place's data arrives, in any order. */
const HAIFA = SCENE_PLACES.find((place) => place.id === 'haifa')!
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: WorldInput

/** The same place, its spans met for the first time (what the water remembers hangs on them). */
const fresh = (): WorldInput => ({ ...loaded, terrain: { ...loaded.terrain, water: structuredClone(loaded.terrain.water) } })

beforeAll(async () => {
  stubPublicFetch()
  loaded = worldInput((await loadPlaces([HAIFA])).get(HAIFA.id)!, '2026-03-15T12:00')
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

describe('the water and the order the data arrives in', () => {
  it.each(['bounds', 'city', 'cover', 'waterMask'] as const)('is one water whether %s came last or with the rest', (late) => {
    const together = waterLayers(makeWorldBuilder()(fresh()), BOX)
    const input = fresh(), build = makeWorldBuilder()
    waterLayers(build({ ...input, [late]: null }), BOX)
    const after = waterLayers(build(input), BOX)
    expect(together.flatMap((layer) => layer.bands).length).toBeGreaterThan(0)
    expect(after).toEqual(together)
  })
})

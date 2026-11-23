import { beforeAll, expect, it } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import type { LayerOf } from './types'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let ramon: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  ramon = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'ramon-crater'))).get('ramon-crater')!
})

it('puts the dust airlight in front of the cloud without changing geometric coverage', () => {
  const build = makeWorldBuilder()
  const input = worldInput(ramon, '2026-11-17T15:00')
  const sheets = (forced: typeof input.forced) => cloudLayersOf(build({ ...input, forced }), box)
    .filter((l): l is LayerOf<'cloudSheet'> => l.kind === 'cloudSheet')
  const dusty = sheets({ pm10: 400, dust: 400, visibilityKm: 3 })
  const clean = sheets({ pm10: 0, dust: 0, visibilityKm: 3 })
  const mid = dusty.find(({ lattice }) => lattice === 'mid')!
  const clearMid = clean.find(({ lattice }) => lattice === 'mid')!
  expect(mid.through).toBeDefined()
  expect(Math.max(...mid.through!)).toBeLessThan(0.25)
  expect(Math.min(...mid.through!)).toBeLessThan(Math.max(...mid.through!))
  expect(clearMid.through).toBeUndefined()
  expect(mid.alpha).toEqual(clearMid.alpha)
  expect(mid.key).not.toBe(clearMid.key)
  console.log(JSON.stringify({ ramonDust: dusty.map(({ lattice, through }) => ({
    lattice, min: Math.min(...through!), max: Math.max(...through!),
  })) }))
})

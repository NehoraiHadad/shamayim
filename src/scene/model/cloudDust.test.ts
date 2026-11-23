import { beforeAll, expect, it } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { towerDust } from './cloudDust'
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
}, 30_000)

it('applies the same dust veil to tower crowns and bases, and removes it at night', () => {
  const build = makeWorldBuilder()
  const forced = { pm10: 400, dust: 400, visibilityKm: 3 }
  const day = build({ ...worldInput(ramon, '2026-11-17T15:00'), forced })
  const night = build({ ...worldInput(ramon, '2026-11-17T21:00'), forced })
  const through = towerDust(day.air, 6, 0.6, 4)!
  expect(through[0]).toBeGreaterThan(through[1])
  expect(through[0]).toBeLessThan(1)
  const clearNight = build({ ...worldInput(ramon, '2026-11-17T21:00'), forced: { ...forced, pm10: 0, dust: 0 } })
  expect(night.light.palette).toEqual(clearNight.light.palette)
  expect(towerDust(night.air, 6, 0.6, 4)).toBeUndefined()
  expect(cloudLayersOf(night, box).every((layer) => layer.kind !== 'cloudSheet' || !layer.through)).toBe(true)
}, 30_000)

import { afterAll, beforeAll, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { WorldState } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersForSky } from './cloudLayers'

export const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }

export function skyGradeCloudFixture() {
  let ramon: LoadedPlace
  beforeAll(async () => {
    stubPublicFetch()
    ramon = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'ramon-crater'))).get('ramon-crater')!
  })
  afterAll(() => vi.unstubAllGlobals())

  const buildWorld = makeWorldBuilder()
  const input = () => worldInput(ramon, '2026-11-17T12:00')
  const frame = (pm10 = 400, visibilityKm = 3, base = input()) =>
    buildWorld({ ...base, forced: { pm10, dust: pm10, visibilityKm } })

  return { frame, input }
}

export function sheetOf(world: WorldState) {
  const sheet = cloudLayersForSky(world, BOX).find(layer => layer.kind === 'cloudSheet')
  if (!sheet) throw new Error('Missing Ramon cloud sheet')
  return sheet
}

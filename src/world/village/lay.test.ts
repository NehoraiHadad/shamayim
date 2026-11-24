import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { groundFn } from '../../data/landmarks/seat'
import { settlementOf } from '../../data/village/settlementOf'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES, STILL_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { OutsideView } from '../types'
import { buildWorld } from '../world'
import { drawnWater } from './water'

const VILLAGES = ['nahalal', 'shadmot-mehola', 'ein-gedi'], TOWNS = ['jerusalem', 'tel-aviv', 'haifa', 'tiberias']
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces([...SCENE_PLACES, ...STILL_PLACES].filter(({ id }) => [...VILLAGES, ...TOWNS].includes(id)))
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

const worldOf = (id: string) => buildWorld(worldInput(loaded.get(id)!, '2026-11-17T12:00' as LocalTime))

describe('a village laid on the town’s picture', () => {
  it.each(TOWNS)('%s is no village', (id) => {
    const { place, cover, city } = loaded.get(id)!
    expect(settlementOf(place, { tile: null, cover: cover ?? null, raster: city?.raster })).toBeNull()
  })

  it.each(VILLAGES)('%s: every house stands on the land as drawn, none on the water', (id) => {
    const world = worldOf(id), view = world.place3 as OutsideView
    const line = groundFn(world.terrain.near.points.map(([x, y]) => [x, y]), 375)
    const onWater = drawnWater(world.water.coastalSea, world.water.spans, 375)
    const houses = view.skyline.boxes.filter(box => box.seed !== undefined)
    expect(houses.length).toBeGreaterThan(5)
    for (const { x, foot } of houses) {
      expect(foot).toBeGreaterThanOrEqual(line(x))
      expect(foot).toBeLessThanOrEqual(108)
      expect(onWater(x, foot)).toBe(false)
    }
  })
})
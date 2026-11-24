import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { box } from '../../test/cloudSheetFrame'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { towerLayerOf } from './cloudCells'
import { skyGeom } from './sky'

let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((place) => place.id === 'haifa'))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

/** Kilometres a tower drifts in a minute of a strong wind's, a tenth of it. */
const STEP_KM = 0.1

it('merges a tower that drifts out into the haze with no step', () => {
  const world = buildWorld({ ...worldInput(loaded.get('haifa')!, '2026-11-17T12:00' as LocalTime),
    forced: { precipitation: 6, weatherCode: 95, cloudCover: 70, windSpeed: 25, windDirection: 250, humidity: 90 },
    forcedLayers: { low: 0.5, mid: 0.2, high: 0.2 } })
  const geom = skyGeom(world, box), snapshot = world.cloudField!.snapshot.find(({ layer }) => layer?.lattice === 'tower')!
  const azimuth = geom.azimuthAt(geom.width / 2) * Math.PI / 180
  const cell = snapshot.cells.reduce((best, other) => other.vKm > best.vKm ? other : best)
  for (const r of [1.5, 2.5, 4]) {
    let before: { w: number; tall: number } | null = null, most = 0
    for (let range = 20; range <= 55; range += STEP_KM) {
      const cells = [{ ...cell, r, share: 1, x: range * Math.sin(azimuth), y: range * Math.cos(azimuth) }]
      const { w, tall } = towerLayerOf(world, box, geom, { ...snapshot, cells }, null, [[0, [0.6, 0.7, 0.8]]])!.cells[0].sprite
      if (before) most = Math.max(most, Math.abs(w - before.w), Math.abs(tall - before.tall))
      before = { w, tall }
    }
    console.info('FAR tower', r, most)
    expect.soft(most, `${r} km`).toBeLessThanOrEqual(1)
  }
})

import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { buildWorld } from '../world'
import { RANGES } from './cells'
import { layerSnapshot } from './density'
import { seenCells } from './seenCells'

/* The satellite's single clouds stand in the field's low layer where the mask saw them. */
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => p.id === 'jerusalem'))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it('places a sighted cloud in the low layer at its azimuth and distance', () => {
  const world = buildWorld({ ...worldInput(loaded.get('jerusalem')!, '2026-11-17T11:00' as LocalTime),
    forced: { cloudCover: 15, precipitation: 0, weatherCode: 1 }, forcedLayers: { low: 0.15, mid: 0, high: 0 } })
  const { field } = world.cloudField!
  const layer = field.layers.find((l) => l.lattice === 'low')!
  const sighting = { azimuth: 90, distanceKm: 8, widthKm: 3, strength: 1 }
  const [cell] = seenCells([sighting], layer)
  expect(cell.x).toBeCloseTo(8, 6)
  expect(Math.abs(cell.y)).toBeLessThan(1e-9)
  expect(cell.r).toBeCloseTo(1.5, 6)
  expect(cell.baseKm).toBeGreaterThan(0)
  expect(cell.tau0).toBeGreaterThan(0)
  const bare = layerSnapshot(field, 'low', 0, 0, RANGES.low[1])
  const seen = layerSnapshot(field, 'low', 0, 0, RANGES.low[1], field.t, [cell])
  expect(seen.cells).toContain(cell)
  expect(seen.densityGrid.resolvedTauAt(8, 0)).toBeGreaterThan(bare.densityGrid.resolvedTauAt(8, 0))
  expect(seenCells([{ ...sighting, strength: 0 }], layer)).toEqual([])
}, 30_000)

import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { buildWorld } from '../world'

/*
 * A real winter storm day (Haifa, 15 March 2026: thunder 10–19 h, CAPE 160–390, low cover 50–65 %): a few large Cb
 * cores with growing Cu con between them and Cu/Sc round them, the rain only under the cores.
 */
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => p.id === 'haifa'))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it('makes a storm day a few large Cb cores with Cu con between, raining only under the cores', () => {
  for (const hour of ['10:00', '14:00', '17:00']) {
    const world = buildWorld(worldInput(loaded.get('haifa')!, `2026-03-15T${hour}` as LocalTime))
    const snapshot = world.cloudField!.snapshot
    const tower = snapshot.find((s) => s.layer?.lattice === 'tower')!
    const low = snapshot.find((s) => s.layer?.lattice === 'low')!
    // The towers are a third of the low cloud at most; the rest is Cu and Sc between them.
    expect(tower.layer!.cover).toBeLessThan(0.4 * (1 - (1 - low.layer!.cover) * (1 - tower.layer!.cover)))
    // Cores 15–25 km apart over the towers' 80 km range: tens of towers, not hundreds.
    const towers = tower.cells.length, cb = tower.cells.filter((c) => c.genus === 'cb').length
    expect(towers).toBeGreaterThan(20)
    expect(towers).toBeLessThan(120)
    // Half the towers or fewer have matured into Cb; the rain falls from them, not from the growing towers.
    expect(cb / towers).toBeGreaterThan(0.2)
    expect(cb / towers).toBeLessThan(0.7)
    expect(tower.cells.filter((c) => c.rainWeight > 0.3 && c.genus !== 'cb')).toEqual([])
  }
}, 60_000)

import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { glaciationOf } from '../../world/glaciation'
import { buildWorld } from '../../world/world'
import { anvilOf } from './anvil'

let haifa: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  haifa = (await loadPlaces(SCENE_PLACES.filter((p) => p.id === 'haifa'))).get('haifa')!
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it('spreads an anvil only where the top has risen three km over the freezing level', () => {
  // A winter storm: freezing at 2.3 km, so a top of 7 km is ice and one of 5 km is not yet.
  const winter = glaciationOf(2300, 0)
  expect(anvilOf(5.2, winter)).toBe(0)
  expect(anvilOf(7, winter)).toBeGreaterThan(0.3)
  expect(anvilOf(8.4, winter)).toBe(1)
  // A warm October one: freezing at 4.6 km, and the same 7 km top is still water.
  const warm = glaciationOf(4600, 0)
  expect(anvilOf(7, warm)).toBe(0)
  expect(anvilOf(8.5, warm)).toBeGreaterThan(0)
  expect(anvilOf(8.5, warm)).toBeLessThan(0.3)
})

it('measures the freezing level from the ground the cells stand on: lower over a mountain, higher over the Jordan Valley', () => {
  expect(glaciationOf(2300, 800)!.fromKm).toBeCloseTo(4.5, 6)
  expect(glaciationOf(2300, -200)!.fromKm).toBeCloseTo(5.5, 6)
})

it('keeps the tropopause rule where the forecast gives no freezing level', () => {
  expect(glaciationOf(null, 0)).toBeNull()
  expect(anvilOf(9.5, null)).toBe(0)
  expect(anvilOf(11, null)).toBe(1)
})

it('takes a real storm day’s freezing level at the shown hour', () => {
  const at = (hour: string) => buildWorld(worldInput(haifa, hour as LocalTime)).glaciation
  // Haifa, 265 m up: freezing at ~2.35 km before dawn of 15 March and at ~2.25 km in the afternoon's cold air.
  expect(at('2026-03-15T06:00')!.fromKm).toBeCloseTo(2.35 - 0.265 + 3, 1)
  expect(at('2026-03-15T14:00')!.fromKm).toBeLessThan(at('2026-03-15T06:00')!.fromKm)
  expect(at('2026-11-17T12:00')).toBeNull()
}, 60_000)

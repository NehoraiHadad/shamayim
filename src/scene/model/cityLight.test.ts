import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { buildWorld } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import { lightness } from './tone'
import { cityLit } from './cityLight'

/* An overcast night over a city: the deck gives the towns' light back from its base, warm and not black. */
const OVERCAST = { cloudCover: 100, precipitation: 0, weatherCode: 3, humidity: 85 }
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => p.id === 'jerusalem'))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const worldAt = (hour: string) => buildWorld({ ...worldInput(loaded.get('jerusalem')!, `2026-11-17T${hour}` as LocalTime),
  forced: OVERCAST, forcedLayers: { low: 1, mid: 0.6, high: 0 } })

it('lights a closed deck over the city at night, warm, the low deck most', () => {
  const night = worldAt('21:00')
  const low = cityLit(night, 'low', 1), mid = cityLit(night, 'mid', 1)
  expect(night.env.glow).toBeGreaterThan(1)
  expect(low.weight).toBeGreaterThan(0.3)
  expect(mid.weight).toBeLessThan(low.weight)
  expect(low.rgb[0]).toBeGreaterThan(low.rgb[2])
  expect(cityLit(night, 'low', 0.1).weight).toBe(0)
}, 30_000)

it('gives no city light by day', () => {
  expect(cityLit(worldAt('12:00'), 'low', 1).weight).toBe(0)
}, 30_000)

it('brightens the night deck toward the horizon over the towns and leaves it darker overhead, with texture', () => {
  const night = worldAt('21:00')
  const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
  const sheet = cloudLayersOf(night, box).find((l) => l.kind === 'cloudSheet' && l.lattice === 'low')!
  if (sheet.kind !== 'cloudSheet') throw new Error('no low sheet')
  expect(lightness(sheet.shade)).toBeGreaterThan(lightness(sheet.body) + 0.04)
  const tones = Array.from(sheet.tone).filter((_, i) => sheet.alpha[i] > 0.9)
  const spread = Math.max(...tones) - Math.min(...tones)
  expect(spread).toBeGreaterThan(0.15)
}, 30_000)

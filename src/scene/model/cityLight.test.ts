import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { buildWorld } from '../../world/world'
import { cityDomes, cityLit, cityOnSky } from './cityLight'
import { cloudLayersOf } from './cloudLayers'
import { skyGeom, skyStops } from './sky'
import { lightness, rgbOf } from './tone'

/* A night over the towns: an overcast deck gives their light back from its base, a clear sky keeps it low, each over its town. */
const OVERCAST = { cloudCover: 100, precipitation: 0, weatherCode: 3, humidity: 85 }
const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => ['jerusalem', 'tel-aviv'].includes(p.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const worldAt = (hour: string, place = 'jerusalem') => buildWorld({ ...worldInput(loaded.get(place)!, `2026-11-17T${hour}` as LocalTime),
  forced: OVERCAST, forcedLayers: { low: 1, mid: 0.6, high: 0 } })

it('lights a closed deck over the city at night, the low deck most, and none of it with no cloud to light', () => {
  const night = worldAt('21:00')
  const low = cityLit(night, 'low', 1)!, mid = cityLit(night, 'mid', 1)!
  expect(low(0, 0, 90, 1)).toBeGreaterThan(0.3)
  expect(mid(0, 0, 90, 3)).toBeLessThan(low(0, 0, 90, 1))
  expect(cityLit(night, 'low', 0.1)).toBeNull()
}, 30_000)

it('gives no city light by day, on the deck or in the sky', () => {
  const day = worldAt('12:00')
  expect(cityLit(day, 'low', 1)).toBeNull()
  expect(cityDomes(day, skyGeom(day, BOX))).toEqual([])
  expect(cityOnSky(day, [0.1, 0.2, 0.3], 0)).toEqual([0.1, 0.2, 0.3])
}, 30_000)

it('lights Tel Aviv’s deck over the land and leaves it dark over the sea, the same distance off', () => {
  const night = worldAt('21:00', 'tel-aviv')
  const lit = cityLit(night, 'low', 1)!
  expect(lit(6, 0, 10, 6)).toBeGreaterThan(1.3 * lit(-6, 0, 10, 6))
  const sheet = cloudLayersOf(night, BOX).find((l) => l.kind === 'cloudSheet' && l.lattice === 'low')!
  if (sheet.kind !== 'cloudSheet' || !sheet.city) throw new Error('no lit low sheet')
  const geom = skyGeom(night, BOX), { xs, city } = sheet
  // The columns' mean weight by the bearing they look toward: inland (45–135°) over seaward (225–315°) where both are in view.
  const mean = (from: number, to: number) => {
    const cols = xs.flatMap((x, i) => { const a = geom.azimuthAt(x); return a >= from && a <= to ? [i] : [] })
    const weights = cols.flatMap((i) => sheet.ys.map((_, r) => city.weight[r * xs.length + i]))
    return weights.reduce((a, b) => a + b, 0) / weights.length
  }
  expect(mean(70, 135)).toBeGreaterThan(1.1 * mean(225, 290))
}, 30_000)

it('warms the clear night sky low over the towns and hardly at the zenith', () => {
  const night = worldAt('21:00'), { palette } = night.light
  const stops = skyStops(night, BOX), low = stops.at(-1)![1], top = stops[0][1]
  const was = { low: rgbOf(palette.horizon), top: rgbOf(palette.top) }
  expect(low[0] - was.low[0]).toBeGreaterThan(0.01)
  expect(low[0] - low[2]).toBeGreaterThan(was.low[0] - was.low[2])
  expect(top[0] - was.top[0]).toBeLessThan(0.5 * (low[0] - was.low[0]))
}, 30_000)

it('keeps texture in the lit deck: its thick parts give more of the light back', () => {
  const sheet = cloudLayersOf(worldAt('21:00'), BOX).find((l) => l.kind === 'cloudSheet' && l.lattice === 'low')!
  if (sheet.kind !== 'cloudSheet') throw new Error('no low sheet')
  const tones = Array.from(sheet.tone).filter((_, i) => sheet.alpha[i] > 0.9)
  expect(Math.max(...tones) - Math.min(...tones)).toBeGreaterThan(0.15)
  expect(Math.max(...sheet.city!.weight)).toBeGreaterThan(0.3)
  expect(lightness(sheet.city!.rgb)).toBeGreaterThan(lightness(sheet.body))
}, 30_000)

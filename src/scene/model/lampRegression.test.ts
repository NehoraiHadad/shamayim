import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { moonPosition } from '../../astro/moon'
import { sunPosition } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import { addMinutes } from '../../domain/time'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { bodyLayers } from './bodies'
import { sceneModel } from './index'
import { lampPlace, withLamp } from './lamp'
import { skyGeom } from './sky'
import type { Lamp, LayerDesc, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const DAY = '2026-11-17T00:00'
const KINDS = ['cloudSheet', 'plane', 'water'] as const
let haifa: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  const places = await loadPlaces(SCENE_PLACES.filter(p => p.id === 'haifa'))
  haifa = places.get('haifa')!
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it.each(['sun', 'moon'] as const)('registers the unquantised %s direction against the bodies descriptors', (body: Lamp['body']) => {
  const start = body === 'sun' ? DAY : '2026-11-23T00:00'
  const input = { ...worldInput(haifa, start), forcedLayers: { low: 0, mid: 0, high: 0 } }
  const { timezone, lat, lon } = input.place
  const position = body === 'sun' ? sunPosition : moonPosition
  for (const target of [30, 5, 0]) {
    const minute = Array.from({ length: 1440 }, (_, i) => i).find(i => {
      const instant = utcOf(addMinutes(start, i), timezone)
      const { altitude } = position(instant, lat, lon)
      return altitude >= target && altitude < target + 0.3
        && (body === 'sun' || sunPosition(instant, lat, lon).altitude < -5)
    })
    expect(minute, `${body} at ${target}°`).toBeDefined()
    const world = buildWorld({ ...input, selected: addMinutes(start, minute!) })
    const disc = bodyLayers(world, BOX).find(layer => layer.id === `bodies.${body}`)?.[body]
    expect(disc).toBeTruthy()
    const { altitude, azimuth } = world.bodies[body]
    const place = lampPlace(skyGeom(world, BOX), body, azimuth, altitude)
    expect(Math.hypot(place.x - disc!.x, place.y - disc!.y)).toBeLessThanOrEqual(1)
  }
})

it('serialises the stored quantum into the right cache part', () => {
  const world = buildWorld({ ...worldInput(haifa, '2026-11-17T12:00'), forcedLayers: { low: 1, mid: 0, high: 0 } })
  const base = sceneModel(world, BOX).layers
  const frame = (azimuth: number) => withLamp(base, {
    ...world, bodies: { ...world.bodies, sun: { ...world.bodies.sun, azimuth } },
  }, BOX, KINDS)
  const keys = ({ key, light }: LayerDesc) => [key, light?.key]
  const a = frame(181), b = frame(181.1), c = frame(183)
  for (const [i, layer] of a.entries()) if ('lamp' in layer) {
    expect(b[i]).toHaveProperty('lamp', layer.lamp)
    expect(keys(b[i])).toEqual(keys(layer))
    expect(c[i]).not.toHaveProperty('lamp', layer.lamp)
    expect(keys(c[i])).not.toEqual(keys(layer))
    if (layer.kind !== 'cloudSheet') expect([layer.key, b[i].key, c[i].key]).toEqual(Array(3).fill(base[i].key))
  }
})

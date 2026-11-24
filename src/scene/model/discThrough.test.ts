import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { transmitAlong } from '../../world/field/transmit'
import type { WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import type { Ctx2D } from '../paint/shared/base/hand'
import { paintBodies } from '../paint/shared/sky/bodies'
import { bodyLayers } from './bodies'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
/** The painters' thickest cloud lets this through; half a code value of a byte; a deep cloud's optical depth. */
const LEAK = 0.08, HALF_CODE = 0.5 / 255, DEEP = 6.23
const SHOWERS = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45,
  windDirection: 250, humidity: 80 }
let haifa: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  haifa = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa'))).get('haifa')!
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const worldAt = (at: string, forced: WorldInput['forced'] = null) =>
  buildWorld({ ...worldInput(haifa, at as LocalTime, at as LocalTime), forced })

/** How much of what is behind it a disc's middle hides, as it is painted. */
function painted(world: WorldState, id: 'bodies.sun' | 'bodies.moon') {
  const layer = bodyLayers(world, BOX).find((found) => found.id === id)
  if (!layer) throw new Error(`no ${id}`)
  let style = 'rgb(0 0 0)', clear = 1
  const alphaOf = (css: string) => Number(/\/ ([\d.]+)\)/.exec(css)?.[1] ?? 1)
  const ctx = new Proxy({ globalAlpha: 1 } as Record<string, unknown>, {
    get: (target, name) => name === 'createRadialGradient' ? () => ({ addColorStop: (at: number, css: string) => { if (!at) style = css } })
      : name === 'fill' ? () => { clear *= 1 - alphaOf(style) * Number(target.globalAlpha) }
        : name in target ? target[name as string] : () => {},
    set: (target, name, value) => {
      if (name === 'fillStyle' && typeof value === 'string') style = value
      target[name as string] = value
      return true
    },
  })
  paintBodies(ctx as unknown as Ctx2D, layer)
  return 1 - clear
}
const through = (world: WorldState, sun: number, moon: number): WorldState => ({ ...world, light: { ...world.light, through: { sun, moon } } })

it('shows no sun through a cloud no light comes through', () => {
  const world = worldAt('2026-11-17T12:00', SHOWERS), { field, snapshot } = world.cloudField!, { azimuth, altitude } = world.bodies.sun
  expect(transmitAlong(field, snapshot, azimuth, altitude)).toBeLessThan(Math.exp(-DEEP))
  expect(painted(world, 'bodies.sun') * LEAK).toBeLessThanOrEqual(HALF_CODE)
})

it('fades the sun by its own ray, once: whole in the open and through thin cloud, gone at a depth of 6.2', () => {
  const world = worldAt('2026-11-17T12:00', SHOWERS), open = painted(through(world, 1, 1), 'bodies.sun')
  // Today's disc behind the mean sky's veil.
  expect(open).toBeGreaterThanOrEqual(1 - 0.97 * (1 - world.light.clear) ** 0.7 - 1e-3)
  for (const tau of [0.2, 1, 2, 2.5]) expect.soft(painted(through(world, Math.exp(-tau), 1), 'bodies.sun')).toBe(open)
  let before = open
  for (let tau = 2.6; tau < 8; tau += 0.2) {
    const seen = painted(through(world, Math.exp(-tau), 1), 'bodies.sun')
    expect.soft(seen).toBeLessThan(before + 1e-9)
    // What the cloud and the disc let through together is the light that comes through, as the disc's soft copies add up.
    expect.soft(seen * LEAK).toBeLessThanOrEqual(open * Math.exp(-tau) * 1.25 + 1e-4)
    before = seen
  }
  expect(painted(through(world, Math.exp(-DEEP), 1), 'bodies.sun') * LEAK).toBeLessThanOrEqual(HALF_CODE)
})

it('fades the moon as the sun', () => {
  const world = worldAt('2026-11-17T22:00', { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 })
  const open = painted(through(world, 1, 1), 'bodies.moon')
  expect(open * LEAK).toBeGreaterThan(HALF_CODE)
  expect(painted(through(world, 1, Math.exp(-2)), 'bodies.moon')).toBe(open)
  expect(painted(through(world, 1, Math.exp(-DEEP)), 'bodies.moon') * LEAK).toBeLessThanOrEqual(HALF_CODE)
})

it('reads each disc along its own ray, and the eye the brighter one\u2019s', () => {
  const world = worldAt('2026-03-15T14:00'), { field, snapshot } = world.cloudField!
  const { sun, moon } = world.bodies, ray = (body: typeof sun) => body.up ? transmitAlong(field, snapshot, body.azimuth, body.altitude) : 1
  expect(world.light.through.sun).toBe(ray(sun))
  expect(world.light.through.moon).toBe(ray(moon))
  expect(world.light.eye).toBeLessThanOrEqual(world.light.through.sun)
})

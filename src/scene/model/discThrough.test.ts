import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import * as transmit from '../../world/field/transmit'
import type { WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import type { Ctx2D } from '../paint/shared/base/hand'
import { paintBodies } from '../paint/shared/sky/bodies'
import { bodyLayers } from './bodies'
import { skyGeom } from './sky'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
/** The painters' thickest cloud lets this through; half a code value of a byte; a deep cloud's optical depth. */
const LEAK = 0.08, HALF_CODE = 0.5 / 255, DEEP = 6.24
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
function painted(world: WorldState, id: 'bodies.sun' | 'bodies.moon' | 'bodies.aureole') {
  const layer = bodyLayers(world, BOX).find((found) => found.id === id)
  if (!layer) throw new Error(`no ${id}`)
  // The moon's seas (ellipses) lie off its middle.
  let style = 'rgb(0 0 0)', clear = 1, sea = false
  const alphaOf = (css: string) => Number(/\/ ([\d.]+)\)/.exec(css)?.[1] ?? 1)
  const ctx = new Proxy({ globalAlpha: 1 } as Record<string, unknown>, {
    get: (target, name) => name === 'createRadialGradient' ? () => ({ addColorStop: (at: number, css: string) => { if (!at) style = css } })
      : name === 'beginPath' ? () => { sea = false } : name === 'ellipse' ? () => { sea = true }
      : name === 'fill' || name === 'fillRect' ? () => { if (!sea) clear *= 1 - alphaOf(style) * Number(target.globalAlpha) }
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
/** The world's clouds let through as much as `rays` says of a direction (the mean of a disc's). */
const lets = vi.hoisted(() => ({ through: null as ((altitude: number) => number) | null }))
vi.mock('../../world/field/transmit', async (original) => {
  const real = await original<typeof transmit>()
  const transmitAcross: typeof transmit.transmitAcross = (field, snapshot, to, step) => lets.through
    ? to.reduce((sum, { altitude }) => sum + lets.through!(altitude), 0) / to.length : real.transmitAcross(field, snapshot, to, step)
  return { ...real, transmitAcross }
})
afterEach(() => { lets.through = null })
function paintedThrough(world: WorldState, id: Parameters<typeof painted>[1], rays: number | ((altitude: number) => number)) {
  lets.through = typeof rays === 'number' ? () => rays : rays
  return painted(world, id)
}

it('shows no sun through a cloud no light comes through', () => {
  const world = worldAt('2026-11-17T12:00', SHOWERS), { field, snapshot } = world.cloudField!, { azimuth, altitude } = world.bodies.sun
  expect(transmit.transmitAlong(field, snapshot, azimuth, altitude)).toBeLessThan(Math.exp(-DEEP))
  expect(painted(world, 'bodies.sun') * LEAK).toBeLessThanOrEqual(HALF_CODE)
})

it('fades the sun by its own ray, once: whole in the open and through thin cloud, gone at a depth of 6.2', () => {
  const world = worldAt('2026-11-17T12:00', SHOWERS), open = paintedThrough(world, 'bodies.sun', 1)
  // Today's disc behind the mean sky's veil.
  expect(open).toBeGreaterThanOrEqual(1 - 0.97 * (1 - world.light.clear) ** 0.7 - 1e-3)
  for (const tau of [0.2, 1, 2, 2.5]) expect.soft(paintedThrough(world, 'bodies.sun', Math.exp(-tau))).toBe(open)
  let before = open
  for (let tau = 2.6; tau < 8; tau += 0.2) {
    const seen = paintedThrough(world, 'bodies.sun', Math.exp(-tau))
    expect.soft(seen).toBeLessThan(before + 1e-9)
    // What the cloud and the disc let through together is the light that comes through, as the disc's soft copies add up.
    expect.soft(seen * LEAK).toBeLessThanOrEqual(open * Math.exp(-tau) * 1.25 + 1e-4)
    before = seen
  }
  expect(paintedThrough(world, 'bodies.sun', Math.exp(-DEEP)) * LEAK).toBeLessThanOrEqual(HALF_CODE)
})

it('lights the air before a cloud with no more of the sun than it lets through', () => {
  const world = worldAt('2026-11-17T12:00', SHOWERS), ray = (t: number) => paintedThrough(world, 'bodies.aureole', t)
  expect(painted(world, 'bodies.aureole')).toBeLessThanOrEqual(HALF_CODE)
  expect(ray(Math.exp(-DEEP))).toBeLessThanOrEqual(HALF_CODE)
  expect(ray(1)).toBeGreaterThan(20 * HALF_CODE)
  expect(ray(0.1)).toBeLessThan(ray(0.2))
})

it('fades the moon as the sun', () => {
  const world = worldAt('2026-11-17T22:00', { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 })
  const open = paintedThrough(world, 'bodies.moon', 1)
  expect(open * LEAK).toBeGreaterThan(HALF_CODE)
  expect(paintedThrough(world, 'bodies.moon', Math.exp(-2))).toBe(open)
  expect(paintedThrough(world, 'bodies.moon', Math.exp(-DEEP)) * LEAK).toBeLessThanOrEqual(HALF_CODE)
})

it('keeps a disc half out of a cloud, as it is drawn', () => {
  const world = worldAt('2026-11-17T12:00', SHOWERS), open = paintedThrough(world, 'bodies.sun', 1)
  const { y } = bodyLayers(world, BOX).find(({ id }) => id === 'bodies.sun')!.sun!
  const middle = skyGeom(world, BOX).domeAltitudeAt(y)
  for (const side of [1, -1]) {
    expect(paintedThrough(world, 'bodies.sun', (altitude) => (altitude - middle) * side > 1e-6 ? 1 : 0)).toBe(open)
  }
})

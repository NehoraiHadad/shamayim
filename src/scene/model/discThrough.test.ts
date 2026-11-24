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
import { cloudLayersOf } from './cloudLayers'
import type { LayerDesc, LayerOf, SceneBox } from './types'

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

/** With the place's own ground (m), as the scene's harness gives it. */
function worldAt(at: string, forced: WorldInput['forced'] = null) {
  const input = worldInput(haifa, at as LocalTime, at as LocalTime)
  return buildWorld({ ...input, forecast: { ...input.forecast, elevation: 63 }, forced })
}

/** How much of what is behind it a disc's middle hides, as it is painted. */
function painted(world: WorldState, id: 'bodies.sun' | 'bodies.moon' | 'bodies.aureole', clouds: LayerDesc[] = cloudLayersOf(world, BOX)) {
  const layer = bodyLayers(world, BOX, undefined, clouds).find((found) => found.id === id)
  // An aureole with none of the sun's light has no layer.
  if (!layer && id === 'bodies.aureole') return 0
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
/** The same under nothing but a sheet that lets that much through, above a place and below it. */
function paintedThrough(world: WorldState, id: Parameters<typeof painted>[1], above: number, below = above, y = 200) {
  const sheet = { kind: 'cloudSheet', xs: [0, BOX.width], ys: [0, y - 0.5, y + 0.5, BOX.skyHeight],
    alpha: [above, above, above, above, below, below, below, below].map((t) => 1 - t) } as LayerOf<'cloudSheet'>
  return painted({ ...world, cloudField: undefined }, id, [sheet])
}

it('shows no sun through a cloud no light comes through', () => {
  const world = worldAt('2026-11-17T12:00', SHOWERS), { field, snapshot } = world.cloudField!, { azimuth, altitude } = world.bodies.sun
  expect(transmitAlong(field, snapshot, azimuth, altitude)).toBeLessThan(Math.exp(-DEEP))
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
    // What the cloud and the disc let through together is the light that comes through, as the disc's soft copies add up
    // (the sheet is drawn in bytes).
    expect.soft(seen * LEAK).toBeLessThanOrEqual(open * (Math.exp(-tau) + HALF_CODE) * 1.25)
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
  expect(paintedThrough(world, 'bodies.sun', 1, 0, y)).toBe(open)
  expect(paintedThrough(world, 'bodies.sun', 0, 1, y)).toBe(open)
})

it('hides the sun behind a tower', () => {
  const world = worldAt('2026-03-15T14:00')
  expect(painted(world, 'bodies.sun', cloudLayersOf(world, BOX).filter(({ kind }) => kind === 'cloudCells')) * LEAK).toBeLessThanOrEqual(HALF_CODE)
})

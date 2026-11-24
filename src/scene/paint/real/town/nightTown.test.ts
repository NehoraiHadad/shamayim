import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { BOX, recordOutside } from '../../../../test/outsideRecording'
import { SCENE_PLACES } from '../../../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../../../test/sceneWorld'
import type { LocalTime } from '../../../../domain/types'
import { makeWorldBuilder } from '../../../../world/world'
import { outsideLayer } from '../../../model/outside'
import type { LayerOf } from '../../../model/types'
import type { Ctx2D } from '../../shared/base/hand'
import { paintOutside } from '../outside'
import { nightLight } from './nightTown'

let haifa: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  haifa = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa'))).get('haifa')!
})
afterAll(() => vi.unstubAllGlobals())

const layerAt = (at: LocalTime) => outsideLayer(makeWorldBuilder()(worldInput(haifa, at, at)), BOX)!

/** Every glow of a painted layer, with the context's state it was laid in, and the state left behind. */
function glowsOf(layer: LayerOf<'outside'>) {
  const state: Record<string, unknown> = { globalAlpha: 1, globalCompositeOperation: 'source-over' }
  const glows: { x: number; y: number; w: number; h: number; alpha: number; blend: unknown }[] = []
  recordOutside((recording, desc, env) => paintOutside(new Proxy(recording as object, {
    get: (target, op) => {
      if (op in state) return state[op as string]
      if (op !== 'drawImage') return Reflect.get(target, op)
      return (...[, , , , , x, y, w, h]: number[]) => {
        glows.push({ x, y, w, h, alpha: state.globalAlpha as number, blend: state.globalCompositeOperation })
      }
    },
    set: (target, key, value) => {
      if (key in state) state[key as string] = value
      return Reflect.set(target, key, value)
    },
  }) as Ctx2D, desc, env), layer)
  return { glows, state, light: glows.reduce((sum, { w, h, alpha }) => sum + w * h * alpha, 0) }
}

it('lights no street by day, nor with no window lit', () => {
  const day = layerAt('2026-11-17T12:00'), night = layerAt('2026-11-17T21:00')
  expect(nightLight(day)).toBeNull()
  expect(glowsOf(day).glows).toEqual([])
  expect(nightLight({ ...night, shine: { ...night.shine, windows: 0 } })).toBeNull()
})

it('lays added light inside the layer, and leaves the context as it was', () => {
  const layer = layerAt('2026-11-17T21:00'), { glows, state } = glowsOf(layer), { y, h } = layer.bounds
  expect(glows.length).toBeGreaterThan(20)
  for (const glow of glows) {
    expect(glow.blend).toBe('lighter')
    expect(glow.alpha).toBeLessThan(.5)
    expect(glow.y).toBeGreaterThanOrEqual(y - 1e-9)
    expect(glow.y + glow.h).toBeLessThanOrEqual(y + h + 1e-9)
  }
  expect(state).toEqual({ globalAlpha: 1, globalCompositeOperation: 'source-over' })
})

it('rises with the lit windows, and keeps the streets in the small hours', () => {
  const late = layerAt('2026-11-17T03:00'), evening = layerAt('2026-11-17T21:00')
  const sweep = Array.from({ length: 21 }, (_, i) => nightLight({ ...evening, shine: { ...evening.shine, windows: i * .02 } }))
  for (let i = 1; i < sweep.length; i++) expect(sweep[i]!.street).toBeGreaterThanOrEqual(sweep[i - 1]?.street ?? 0)
  expect(glowsOf(evening).light).toBeGreaterThan(glowsOf(late).light)
  expect(nightLight(late)!.street).toBeGreaterThan(.4 * nightLight(evening)!.street)
})

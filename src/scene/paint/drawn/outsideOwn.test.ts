import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { BOX } from '../../../test/outsideRecording'
import { SCENE_PLACES } from '../../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../../test/sceneWorld'
import { buildWorld } from '../../../world/world'
import { outsideLayer } from '../../model/outside'
import { PLAIN_LIGHT, type StyleLight } from '../../model/styleLight'
import type { LayerOf } from '../../model/types'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'
import { DRAWN_LIGHT } from './light'
import { skyFormIn } from './outsideOwn'
import { paintDrawnOutside } from './town'

let layerOf: (light: StyleLight) => LayerOf<'outside'>
beforeAll(async () => {
  stubPublicFetch()
  const places = await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa'))
  const world = buildWorld(worldInput(places.get('haifa')!, '2026-11-17T12:00'))
  layerOf = (light) => outsideLayer(world, BOX, [], light)!
}, 60_000)
afterEach(() => vi.unstubAllEnvs())

it('carries the sky\'s form from this hand\'s light to its painter, through a worker\'s message', () => {
  const layer = layerOf(DRAWN_LIGHT), sent = structuredClone(layer)
  expect(sent).toEqual(layer)
  expect(skyFormIn(sent)!.tiers).toHaveLength(layer.tiers.length)
})

it('keeps what a hand adds in its own slot, beside the layer\'s facts', () => {
  const look = DRAWN_LIGHT.outside!
  const spoof: StyleLight = { ...DRAWN_LIGHT, outside: (facts) => ({ ...look(facts), own: { kind: 'sky', key: 'spoof' } }) }
  const layer = layerOf(spoof), usual = layerOf(DRAWN_LIGHT)
  expect(layer).toEqual({ ...usual, own: { kind: 'sky', key: 'spoof' } })
  expect('own' in layerOf(PLAIN_LIGHT)).toBe(false)
})

it('refuses a layer lit for another hand, and in a release paints nothing of it', () => {
  const calls: PropertyKey[] = []
  const ctx = new Proxy({}, { get: (_, op) => (calls.push(op), () => {}), set: (_, op) => (calls.push(op), true) }) as Ctx2D
  const plain = layerOf(PLAIN_LIGHT), env = {} as PaintEnv
  expect(() => paintDrawnOutside(ctx, plain, env)).toThrow('sky form')
  vi.stubEnv('DEV', false)
  paintDrawnOutside(ctx, plain, env)
  expect(calls).toEqual([])
})

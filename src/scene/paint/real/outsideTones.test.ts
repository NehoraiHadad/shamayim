import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { smoothstep } from '../../../domain/smoothstep'
import { addMinutes } from '../../../domain/time'
import { BOX, recordOutside } from '../../../test/outsideRecording'
import { SCENE_PLACES } from '../../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../../test/sceneWorld'
import { makeWorldBuilder } from '../../../world/world'
import { outsideLayer } from '../../model/outside'
import type { LayerOf } from '../../model/types'
import { paintOutside } from './outside'

const record = (layer: LayerOf<'outside'>) => recordOutside(paintOutside, layer)

let haifa: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  const places = await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa'))
  haifa = places.get('haifa')!
})
afterAll(() => vi.unstubAllGlobals())

function receiverBytes(layer: LayerOf<'outside'>) {
  const bytes: number[] = []
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number')) {
      bytes.push(...value.map(v => Math.round(v * 255)))
    } else Object.values(value).forEach(visit)
  }
  visit(layer.receivers)
  visit(layer.accessories)
  for (const item of layer.items) if (item.kind === 'mark') {
    visit(item.glyph.surfaces)
    visit(item.glyph.gilding)
    if (item.glyph.surfaces) for (const name of ['wall', 'shade', 'deep', 'rim', 'stone', 'roof', 'glass'] as const) visit(item.glyph.tones[name])
  }
  return bytes
}

const byteStep = (a: number[], b: number[]) => {
  expect(a).toHaveLength(b.length)
  return a.reduce((max, v, i) => Math.max(max, Math.abs(v - b[i])), 0)
}

it('keeps Haifa building geometry and emitters across solar altitudes −11.9° and −12.1°', () => {
  const time = '2026-11-17T17:34'
  const world = makeWorldBuilder()(worldInput(haifa, time, time))
  const at = (altitude: number) => {
    const layer = outsideLayer({ ...world, bodies: { ...world.bodies, sun: { ...world.bodies.sun, altitude } },
      night: { ...world.night, dark: smoothstep(-4, -12, altitude) } }, BOX)!
    return { ...layer, sea: null, land: null }
  }
  const before = at(-11.9), after = at(-12.1)
  const fabric = (layer: LayerOf<'outside'>) => ({ ...layer, items: layer.items.filter(i => i.kind === 'box' || i.kind === 'tower') })
  const a = record(fabric(before)), b = record(fabric({ ...after, shine: before.shine, tiers: before.tiers }))
  expect(a.form.length).toBeGreaterThan(200)
  expect(b.form).toEqual(a.form)
  expect(a.lit.size).toBeGreaterThan(0)
  expect(b.lit).toEqual(a.lit)
  expect(b.halos).toEqual(a.halos)
  expect(b.emissions).toEqual(a.emissions)
  for (const [i, alpha] of record(fabric(after)).halos.entries()) expect(Math.abs(alpha - a.halos[i])).toBeLessThanOrEqual(.00101)
  expect(byteStep(receiverBytes(before), receiverBytes(after))).toBeLessThanOrEqual(1)
})

it('bounds every one-minute architectural tone step over Haifa’s evening', () => {
  const start = '2026-11-17T16:00'
  const build = makeWorldBuilder(), input = worldInput(haifa, start, start)
  let previous = receiverBytes(outsideLayer(build(input), BOX)!)
  let largest = 0, largestAt = start as string
  for (let minute = 1; minute <= 300; minute++) {
    const selected = addMinutes(start, minute)
    const next = receiverBytes(outsideLayer(build({ ...input, selected }), BOX)!)
    const step = byteStep(previous, next)
    if (step > largest) { largest = step; largestAt = selected }
    previous = next
  }
  expect(largest, largestAt).toBeLessThanOrEqual(8)
}, 60_000)

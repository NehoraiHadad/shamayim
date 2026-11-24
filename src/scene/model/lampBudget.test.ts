import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/time'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { sceneModel } from './index'
import { withLamp } from './lamp'
import type { LayerDesc, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const KINDS = ['cloudSheet', 'plane', 'canopy', 'water'] as const
const keys = ({ key, light }: LayerDesc) => [key, light?.key]
let haifa: LoadedPlace

beforeAll(async () => {
  stubPublicFetch()
  const places = await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa'))
  haifa = places.get('haifa')!
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it('keeps the 24-hour Haifa scrub within the descriptor key budget', () => {
  const start = '2026-11-17T00:00', input = worldInput(haifa, start), build = makeWorldBuilder()
  const counts = new Map<string, [Set<string>, Set<string>]>(KINDS.map(kind => [kind, [new Set(), new Set()]]))
  for (let minute = 0; minute < 1440; minute++) {
    const world = build({ ...input, selected: addMinutes(start, minute) })
    const off = sceneModel(world, BOX).layers
    const on = withLamp(off, world, BOX, KINDS)
    for (const layer of off) counts.get(layer.kind)?.[0].add(JSON.stringify(keys(layer)))
    for (const layer of on) counts.get(layer.kind)?.[1].add(JSON.stringify(keys(layer)))
  }
  for (const [kind, [off, on]] of counts) console.info(`Haifa ${kind} distinct raster keys: ${off.size} -> ${on.size}`)
  for (const [kind, [off, on]] of counts) {
    expect(off.size, kind).toBeGreaterThan(0)
    expect(on.size, kind).toBeLessThanOrEqual(off.size * 1.05)
  }
}, 240_000)


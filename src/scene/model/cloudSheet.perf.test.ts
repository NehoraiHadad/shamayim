import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/time'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { sceneModel } from './index'
import type { SceneBox } from './types'

const ids = ['jerusalem', 'haifa', 'tiberias']
const at = '2026-11-17T13:00'
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
let places: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter(place => ids.includes(place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

function elapsed(run: () => ReturnType<typeof sceneModel>) {
  const start = performance.now()
  const model = run()
  return { ms: performance.now() - start, model }
}

const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]

it.each(ids)('measures new-minute sheet overhead on the recorded %s panorama', id => {
  const input = worldInput(places.get(id)!, at, at)
  const build = makeWorldBuilder()
  const forced = { cloudCover: 99, thickCloud: 80, temperature: 24, humidity: 70, weatherCode: 3 }
  const forcedLayers = { low: 0.74, mid: 0.63, high: 0.81 }
  const frames = Array.from({ length: 24 }, (_, minute) =>
    build({ ...input, selected: addMinutes(at, minute), forced, forcedLayers }))
  const samples = frames.map((world, minute) => {
    const field = world.cloudField!
    const baselineWorld = { ...world, cloudField: { ...field, snapshot: field.snapshot.map(snapshot => ({
      ...snapshot, layer: snapshot.layer && { ...snapshot.layer, cover: 0, form: { conv: 0, strat: 0, sheet: 0, veil: 0 } },
    })) } }
    // Keep the field, density grids and shadow candidates. Suppress only the sheet hand-off.
    const withSheets = () => sceneModel(world, box)
    const withoutSheets = () => sceneModel(baselineWorld, box)
    const withFirst = minute % 2 === 0
    const first = withFirst ? withSheets : withoutSheets
    const second = withFirst ? withoutSheets : withSheets
    const firstCold = elapsed(first)
    const secondCold = elapsed(second)
    const cold = withFirst ? firstCold : secondCold
    const coldBaseline = withFirst ? secondCold : firstCold
    const secondWarm = elapsed(second).ms
    const firstWarm = elapsed(first).ms
    const baseline = withFirst ? secondWarm : firstWarm
    const model = withFirst ? firstWarm : secondWarm
    expect(cold.model.layers.filter(layer => layer.kind === 'cloudSheet')).toHaveLength(3)
    return { baseline, model, coldIncrement: cold.ms - coldBaseline.ms }
  }).slice(8)
  const baselineMs = median(samples.map(sample => sample.baseline))
  const incrementMs = median(samples.map(sample => sample.model - sample.baseline))
  const coldIncrementMs = median(samples.map(sample => sample.coldIncrement))
  console.info({ id, baselineMs, incrementMs, coldIncrementMs, ratio: incrementMs / baselineMs })
  expect(incrementMs).toBeLessThanOrEqual(1.5)
  expect(incrementMs / baselineMs).toBeLessThanOrEqual(0.25)
}, 120_000)

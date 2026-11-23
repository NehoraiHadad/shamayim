import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/time'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { RANGES } from '../../world/field/cells'
import { densityGrid } from '../../world/field/density'
import type { CloudField } from '../../world/field/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudSheetOf } from './cloudSheet'
import { skyGeom } from './sky'
import { sceneModel } from './index'
import type { SceneBox } from './types'

const sheetCases = [
  ['neve-zohar', '2026-11-17T16:00'], ['haifa', '2026-11-17T15:30'],
  ['tel-aviv', '2026-11-17T12:00'], ['haifa', '2026-03-15T14:00'],
] as const
const ids = ['jerusalem', 'haifa', 'tiberias']
const at = '2026-11-17T13:00'
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
let places: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(place => ids.includes(place.id) || sheetCases.some(([id]) => id === place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

function elapsed(run: () => ReturnType<typeof sceneModel>) {
  const start = performance.now()
  const model = run()
  return { ms: performance.now() - start, model }
}

/** Warm redraws per minute and variant: the fastest stands for the work, the rest for the runner's noise. */
const WARM_REPS = 7

const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]

function rasterBuildMs(field: CloudField, previous: boolean) {
  const start = performance.now()
  for (const { lattice } of field.layers) {
    // Clip only the build radius to reconstruct the N3h low and mid domains.
    if (lattice === 'low' || lattice === 'mid') densityGrid(field, lattice, 0, 0, RANGES[lattice][previous ? 0 : 1])
  }
  return performance.now() - start
}

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
    // Warm redraws, interleaved, the fastest of each: one sample apiece put a runner's GC pause or a busy neighbour into
    // the difference of two ~5 ms frames (haifa read 0.30 on CI three times and 0.01–0.11 locally, on the same code).
    let firstWarm = Infinity, secondWarm = Infinity
    for (let rep = 0; rep < WARM_REPS; rep++) {
      secondWarm = Math.min(secondWarm, elapsed(second).ms)
      firstWarm = Math.min(firstWarm, elapsed(first).ms)
    }
    const baseline = withFirst ? secondWarm : firstWarm
    const model = withFirst ? firstWarm : secondWarm
    expect(cold.model.layers.filter(layer => layer.kind === 'cloudSheet')).toHaveLength(3)
    const rasterFirst = rasterBuildMs(field.field, withFirst)
    const rasterSecond = rasterBuildMs(field.field, !withFirst)
    const rasterMs = withFirst ? rasterSecond : rasterFirst
    const rasterBaseline = withFirst ? rasterFirst : rasterSecond
    return { baseline, model, coldIncrement: cold.ms - coldBaseline.ms, rasterMs, rasterDelta: rasterMs - rasterBaseline }
  }).slice(8)
  const baselineMs = median(samples.map(sample => sample.baseline))
  const incrementMs = median(samples.map(sample => sample.model - sample.baseline))
  const coldIncrementMs = median(samples.map(sample => sample.coldIncrement))
  const rasterMs = median(samples.map(sample => sample.rasterMs))
  const rasterDeltaMs = median(samples.map(sample => sample.rasterDelta))
  console.info({ id, baselineMs, incrementMs, coldIncrementMs, rasterMs, rasterDeltaMs, ratio: incrementMs / baselineMs })
  // CI p95 + 15 % (the warm-scrub rule): CI runners measured 1.76 and 3.02 ms on runs that passed on rerun.
  expect(incrementMs + Math.max(0, rasterDeltaMs)).toBeLessThanOrEqual(3.5)
  expect(incrementMs / baselineMs).toBeLessThanOrEqual(0.25)
}, 120_000)

it.each(sheetCases)('gates fresh sheet and minute-step overhead at %s %s', (id, time) => {
  const input = worldInput(places.get(id)!, time, time)
  const build = makeWorldBuilder()
  const colours = { body: [0.6, 0.65, 0.7], shade: [0.6, 0.65, 0.7], lit: [0.6, 0.65, 0.7], light: 0.5 } as const
  const samples = Array.from({ length: 24 }, (_, minute) => {
    const world = build({ ...input, selected: addMinutes(time, minute) })
    const field = world.cloudField!
    const geom = skyGeom(world, box)
    const variants = (shaped: boolean) => field.snapshot.map(snapshot => ({
      ...snapshot,
      cells: shaped || (snapshot.layer?.lattice !== 'low' && snapshot.layer?.lattice !== 'mid') ? snapshot.cells : [],
    }))
    const cold = (shaped: boolean) => {
      const snapshots = variants(shaped)
      const start = performance.now()
      for (const snapshot of snapshots) cloudSheetOf(world, geom, snapshot, colours)
      return performance.now() - start
    }
    const step = (shaped: boolean) => {
      const variant = { ...world, cloudField: { ...field, snapshot: variants(shaped) } }
      return elapsed(() => sceneModel(variant, box)).ms
    }
    const pair = (measure: (shaped: boolean) => number) => {
      const shapedFirst = minute % 2 === 0
      const first = measure(shapedFirst), second = measure(!shapedFirst)
      return shapedFirst ? { base: second, shaped: first } : { base: first, shaped: second }
    }
    return { cold: pair(cold), step: pair(step) }
  }).slice(8)
  for (const key of ['cold', 'step'] as const) {
    const base = median(samples.map(sample => sample[key].base))
    const shaped = median(samples.map(sample => sample[key].shaped))
    console.info({ id, time, mode: key, base, shaped })
    expect(shaped / base, key).toBeLessThanOrEqual(1.10)
  }
}, 120_000)

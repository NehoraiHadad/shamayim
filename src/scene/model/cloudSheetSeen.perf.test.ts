import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { RANGES } from '../../world/field/cells'
import { layerSnapshot } from '../../world/field/density'
import { makeWorldBuilder } from '../../world/world'
import { cloudSheetOf } from './cloudSheet'
import type * as Seen from './cloudSheetSeen'
import { skyGeom } from './sky'

const view = vi.hoisted(() => ({ shaped: true }))
vi.mock('./cloudSheetSeen', async (load) => {
  const { seenDepth } = await load<typeof Seen>()
  return { seenDepth: (...args: Parameters<typeof seenDepth>) => view.shaped ? seenDepth(...args) : () => args[4] }
})

const cases = [
  ['neve-zohar', '2026-11-17T16:00'], ['haifa', '2026-11-17T15:30'], ['tel-aviv', '2026-11-17T12:00'], ['haifa', '2026-03-15T14:00'],
] as const
const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const colours = { body: [0.6, 0.65, 0.7], shade: [0.6, 0.65, 0.7], lit: [0.6, 0.65, 0.7], light: 0.5 } as const
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter((place) => cases.some(([id]) => id === place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
/** Fresh sheets per minute and variant: the fastest stands for the work, the rest for the runner's noise. */
const REPS = 5

/** A scene's cold sheets (ms), the median minute, plain and as the eye sees the field. */
function coldMs(id: string, time: string) {
  const input = worldInput(places.get(id)!, time as LocalTime, time as LocalTime), build = makeWorldBuilder()
  const samples = Array.from({ length: 24 }, (_, minute) => {
    const world = build({ ...input, selected: addMinutes(time as LocalTime, minute) }), geom = skyGeom(world, box)
    const best = { shaped: Infinity, plain: Infinity }
    for (let rep = 0; rep < 2 * REPS; rep++) {
      view.shaped = (rep + minute) % 2 === 0
      const { field } = world.cloudField!
      const start = performance.now()
      // A new minute's sheets: every layer's cells and raster, as `cloudFieldAt` takes them, and the sheets on them.
      for (const { lattice } of field.layers) {
        cloudSheetOf(world, geom, layerSnapshot(field, lattice, 0, 0, RANGES[lattice][1]), colours)
      }
      const variant = view.shaped ? 'shaped' : 'plain'
      best[variant] = Math.min(best[variant], performance.now() - start)
    }
    return best
  }).slice(8)
  const plain = median(samples.map((sample) => sample.plain)), shaped = median(samples.map((sample) => sample.shaped))
  console.info({ id, time, plain, shaped, ratio: shaped / plain })
  return { plain, shaped }
}

// The scenes' together: one alone is a few ms, where a runner's noise is as large as the difference.
it('shows the field as the eye sees it within the cold budget', () => {
  const total = { plain: 0, shaped: 0 }
  for (const [id, time] of cases) {
    const { plain, shaped } = coldMs(id, time)
    total.plain += plain
    total.shaped += shaped
  }
  console.info({ ...total, ratio: total.shaped / total.plain })
  expect(total.shaped / total.plain).toBeLessThanOrEqual(1.1)
}, 240_000)

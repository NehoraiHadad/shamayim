import { beforeAll, expect, it } from 'vitest'
import { addMinutes } from '../../domain/minutes'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { BirdKind } from '../../world/life'
import { makeWorldBuilder } from '../../world/world'
import { sceneModel } from './index'
import { distance, pose } from './lifeContinuityMetrics'
import { LIFE_START } from './lifeTracks'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const IDS = ['haifa', 'tel-aviv', 'shadmot-mehola']
const START = '2026-11-17T05:00'
const END_MINUTE = 14 * 60
const STEP_MINUTE = 20

interface Sample { place: string; at: string; id: string; kind: BirdKind; distanceM: number; px: number }

let places: Map<string, LoadedPlace>
const samples: Sample[] = []

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter((p) => IDS.includes(p.id)))
}, 120_000)

it.each(IDS)('%s birds travel visibly over 10 s on the live path', (id) => {
  const build = makeWorldBuilder(), input = worldInput(places.get(id)!, START, START)
  for (let minute = 0; minute <= END_MINUTE; minute += STEP_MINUTE) {
    const at = addMinutes(START, minute)
    const world = build({ ...input, selected: at })
    const flocks = new Map(world.life.birds.map((f) => [`birds.${f.id}`, f]))
    for (const layer of sceneModel(world, BOX, null, LIFE_START).layers) {
      if (layer.kind !== 'birds' || layer.id.endsWith('.front')) continue
      const flock = flocks.get(layer.id)!
      const px = distance(pose(layer, 0).point, pose(layer, 10).point)
      samples.push({ place: id, at, id: layer.id, kind: layer.bird, distanceM: flock.distanceM, px })
    }
  }
}, 60_000)

it('meets travel thresholds across all three places and logs per-kind travel', () => {
  const byKind = new Map<BirdKind, number[]>()
  for (const s of samples) {
    const list = byKind.get(s.kind) ?? []
    list.push(s.px)
    byKind.set(s.kind, list)
  }
  const summary = Object.fromEntries([...byKind.entries()].map(([kind, values]) => [
    kind, { count: values.length, medianPx: Number(median(values).toFixed(2)), minPx: Number(Math.min(...values).toFixed(2)) },
  ]))
  console.log('birds 10s travel (CSS px)', JSON.stringify(summary))
  expect(samples.length).toBeGreaterThanOrEqual(20)
  expect(median(samples.map((s) => s.px))).toBeGreaterThanOrEqual(8)
  for (const s of samples) {
    if (s.distanceM < 700) {
      expect(s.px, `${s.place} ${s.at} ${s.id} (${s.kind} at ${s.distanceM.toFixed(0)} m)`).toBeGreaterThanOrEqual(5)
    }
  }
})

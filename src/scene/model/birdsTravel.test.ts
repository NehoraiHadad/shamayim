import { beforeAll, expect, it } from 'vitest'
import { addMinutes } from '../../domain/minutes'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { BirdKind } from '../../world/life'
import { makeWorldBuilder } from '../../world/world'
import { sceneModel } from './index'
import { distance, pose, visible } from './lifeContinuityMetrics'
import { LIFE_START } from './lifeTracks'
import { skyGeom } from './sky'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const IDS = ['haifa', 'tel-aviv', 'shadmot-mehola']
const START = '2026-11-17T05:00'
const END_MINUTE = 14 * 60
const STEP_MINUTE = 20

interface Sample { place: string; at: string; id: string; kind: BirdKind; distanceM: number; nearM: number; px: number }

let places: Map<string, LoadedPlace>
const byPlace = new Map<string, Sample[]>()

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function samplesFor(id: string): Sample[] {
  let out = byPlace.get(id)
  if (out) return out
  out = []
  const build = makeWorldBuilder(), input = worldInput(places.get(id)!, START, START)
  for (let minute = 0; minute <= END_MINUTE; minute += STEP_MINUTE) {
    const at = addMinutes(START, minute)
    const world = build({ ...input, selected: at })
    const geom = skyGeom(world, BOX)
    const flocks = new Map(world.life.birds.map((f) => [`birds.${f.id}`, f]))
    for (const layer of sceneModel(world, BOX, null, LIFE_START).layers) {
      if (layer.kind !== 'birds' || layer.id.endsWith('.front')) continue
      const p0 = pose(layer, 0), p10 = pose(layer, 10)
      if (!visible(p0.point, geom) || !visible(p10.point, geom) || p0.alpha < 0.2 || p10.alpha < 0.2) continue
      const flock = flocks.get(layer.id)!
      const px = distance(p0.point, p10.point)
      out.push({ place: id, at, id: layer.id, kind: layer.bird, distanceM: flock.distanceM, nearM: flock.nearM, px })
    }
  }
  byPlace.set(id, out)
  return out
}

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter((p) => IDS.includes(p.id)))
}, 120_000)

it.each(IDS)('%s birds travel visibly over 10 s on the live path', (id) => {
  const list = samplesFor(id)
  expect(list.length).toBeGreaterThan(0)
  for (const s of list) {
    expect(s.px, `${s.place} ${s.at} ${s.id} (${s.kind} at ${s.distanceM.toFixed(0)} m)`).toBeGreaterThanOrEqual(0.3)
    if (s.distanceM < 700) {
      expect(s.px, `${s.place} ${s.at} ${s.id} (${s.kind} at ${s.distanceM.toFixed(0)} m)`).toBeGreaterThanOrEqual(5)
    }
  }
}, 60_000)

it('meets travel thresholds across all three places and logs per-kind travel', () => {
  const samples = IDS.flatMap(samplesFor)
  const byKind = new Map<BirdKind, Sample[]>()
  for (const s of samples) {
    const list = byKind.get(s.kind) ?? []
    list.push(s)
    byKind.set(s.kind, list)
  }
  const summary = Object.fromEntries([...byKind.entries()].map(([kind, list]) => [
    kind, {
      count: list.length,
      medianPx: Number(median(list.map((s) => s.px)).toFixed(2)),
      minPx: Number(Math.min(...list.map((s) => s.px)).toFixed(2)),
      maxPx: Number(Math.max(...list.map((s) => s.px)).toFixed(2)),
      medianDistanceM: Math.round(median(list.map((s) => s.distanceM))),
      medianNearM: Math.round(median(list.map((s) => s.nearM))),
    },
  ]))
  const midRange = samples.filter((s) => s.distanceM < 1500)
  const nearRange = samples.filter((s) => s.distanceM < 700)
  console.log('birds 10s travel (CSS px)', JSON.stringify({
    byKind: summary,
    all: { count: samples.length, medianPx: Number(median(samples.map((s) => s.px)).toFixed(2)), minPx: Number(Math.min(...samples.map((s) => s.px)).toFixed(2)), maxPx: Number(Math.max(...samples.map((s) => s.px)).toFixed(2)) },
    midRange: { count: midRange.length, medianPx: Number(median(midRange.map((s) => s.px)).toFixed(2)), minPx: Number(Math.min(...midRange.map((s) => s.px)).toFixed(2)), maxPx: Number(Math.max(...midRange.map((s) => s.px)).toFixed(2)) },
    nearRange: { count: nearRange.length, medianPx: Number(median(nearRange.map((s) => s.px)).toFixed(2)), minPx: Number(Math.min(...nearRange.map((s) => s.px)).toFixed(2)), maxPx: Number(Math.max(...nearRange.map((s) => s.px)).toFixed(2)) },
  }))
  expect(samples.length).toBeGreaterThanOrEqual(20)
  expect(midRange.length).toBeGreaterThan(0)
  expect(median(midRange.map((s) => s.px))).toBeGreaterThanOrEqual(8)
  for (const s of samples) {
    expect(s.px, `${s.place} ${s.at} ${s.id} (${s.kind} at ${s.distanceM.toFixed(0)} m)`).toBeGreaterThanOrEqual(0.3)
    if (s.distanceM < 700) {
      expect(s.px, `${s.place} ${s.at} ${s.id} (${s.kind} at ${s.distanceM.toFixed(0)} m)`).toBeGreaterThanOrEqual(5)
    }
  }
}, 60_000)

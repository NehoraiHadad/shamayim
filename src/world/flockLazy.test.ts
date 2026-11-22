import { beforeAll, expect, it } from 'vitest'
import { SCENE_PLACES } from '../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../test/sceneWorld'
import { makeWorldBuilder } from './world'

/*
 * A flock's track is laid over the land the first time it is sampled (`lifeSchedule.ts` `lay`), not for the whole day
 * up front. What is shown must not depend on what was sampled before (a scrub forward, backward, or a fresh start), and
 * the world's first build must cost no more than main's (b2e250d, which laid every flock of the day: 960–1391 ms here).
 */

const IDS = ['haifa', 'shadmot-mehola']
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter((p) => IDS.includes(p.id)))
}, 120_000)

const MINUTES = Array.from({ length: 7 }, (_, i) => `2026-11-17T${String(7 + 2 * i).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)

it.each(IDS)('%s: the shown flocks are the same whatever was sampled before', (id) => {
  const place = places.get(id)!
  const birdsAt = (build: ReturnType<typeof makeWorldBuilder>, at: string) => build(worldInput(place, at, at)).life.birds
  const forward = makeWorldBuilder(), backward = makeWorldBuilder()
  const ahead = MINUTES.map((at) => birdsAt(forward, at))
  const behind = [...MINUTES].reverse().map((at) => birdsAt(backward, at)).reverse()
  let seen = 0
  MINUTES.forEach((at, i) => {
    const fresh = birdsAt(makeWorldBuilder(), at)
    expect(ahead[i]).toEqual(fresh)
    expect(behind[i]).toEqual(fresh)
    seen += fresh.length
  })
  expect(seen).toBeGreaterThan(0)
}, 120_000)

/** Main's first build on the reference machine (ms); CI's runners are slower, so it gets three times the room. */
const MAIN_FIRST_BUILD_MS = 1400
const ROOM = process.env.CI ? 3 : 1

it.each(IDS)('%s: the first world build costs no more than main', (id) => {
  const place = places.get(id)!
  const times = [0, 1, 2].map((k) => {
    const at = `2026-11-17T${String(9 + k).padStart(2, '0')}:00`
    const t0 = performance.now()
    makeWorldBuilder()(worldInput(place, at, at))
    return performance.now() - t0
  }).sort((a, b) => a - b)
  console.log(id, 'first world build (ms, median of 3)', times[1].toFixed(0))
  expect(times[1]).toBeLessThanOrEqual(MAIN_FIRST_BUILD_MS * ROOM)
}, 120_000)

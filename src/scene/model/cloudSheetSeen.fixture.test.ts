import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { cloudSheetOf } from './cloudSheet'
import { DOME_ALT, skyGeom } from './sky'
import type { RGB, SceneBox } from './types'

const cases = [
  ['neve-zohar', '2026-11-17T16:00'],
  ['haifa', '2026-11-17T15:30'],
  ['tel-aviv', '2026-11-17T12:00'],
  ['haifa', '2026-03-15T14:00'],
] as const
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const rgb: RGB = [0.6, 0.65, 0.7]
const colours = { body: rgb, shade: rgb, lit: rgb, light: 0.5 }
let places: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter(place => cases.some(([id]) => id === place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it.each(cases)('keeps the relief raster intact on %s at %s', (id, at) => {
  const place = places.get(id)!
  const base = worldInput(place, at, at)
  const world = buildWorld(base)
  const geom = skyGeom(world, box)
  const snapshots = world.cloudField!.snapshot
  const draw = (shape: boolean) => {
    const start = performance.now()
    const sheets = snapshots.flatMap(snapshot => {
      // Give each call a fresh snapshot identity to exercise rasterization instead of its memo.
      const sheet = cloudSheetOf(world, geom, { ...snapshot, cells: shape ? snapshot.cells : [] }, colours)
      return sheet ? [sheet] : []
    })
    return { sheets, ms: performance.now() - start }
  }
  const plain = draw(false), shaped = draw(true)
  expect(shaped.sheets.length).toBeGreaterThan(0)
  for (const [index, sheet] of shaped.sheets.entries()) {
    const start = sheet.ys.findIndex(y => y >= geom.dome(DOME_ALT)) * sheet.xs.length
    expect(start).toBeGreaterThanOrEqual(0)
    expect(sheet.alpha.slice(start)).toEqual(plain.sheets[index].alpha.slice(start))
  }
  const before: number[] = [], after: number[] = []
  // Interleave five timings in both orders, after warming the fixtures and both code paths.
  for (let rep = 0; rep < 5; rep++) {
    if (rep % 2) {
      after.push(draw(true).ms)
      before.push(draw(false).ms)
    } else {
      before.push(draw(false).ms)
      after.push(draw(true).ms)
    }
  }
  const median = (times: number[]) => times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
  console.log(JSON.stringify({ id, at, roundMs: median(before), shapedMs: median(after) }))
}, 30_000)

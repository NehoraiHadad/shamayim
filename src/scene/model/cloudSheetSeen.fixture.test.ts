import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { genusOf } from '../../world/field/genus'
import { gridFor } from './cloudSheetGrid'
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
  places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter(place => cases.some(([id]) => id === place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it.each(cases)('keeps the relief raster intact on %s at %s', (id, at) => {
  const place = places.get(id)!
  const base = worldInput(place, at, at)
  const world = buildWorld(base)
  const geom = skyGeom(world, box)
  const snapshots = world.cloudField!.snapshot
  let count = 0
  for (const snapshot of snapshots) {
    const { layer, heightKm } = snapshot
    if (!layer || (layer.lattice !== 'mid' && layer.lattice !== 'low')) continue
    const genus = genusOf(layer.lattice, layer.form, 0.5)
    const grid = gridFor(id, layer, geom, heightKm, genus)
    const round = cloudSheetOf(world, geom, { ...snapshot, cells: [] }, colours)
    if (!round) continue
    const start = grid.altitudes.findIndex(alt => alt <= DOME_ALT) * round.xs.length
    expect(start).toBeGreaterThanOrEqual(0)
    const end = round.alpha.length
    const roundTau = grid.tau.slice(start, end)
    const shaped = cloudSheetOf(world, geom, snapshot, colours)!
    expect(grid.tau.slice(start, end)).toEqual(roundTau)
    expect(shaped.alpha.slice(start)).toEqual(round.alpha.slice(start))
    expect(shaped.tone.slice(start)).toEqual(round.tone.slice(start))
    count++
  }
  expect(count).toBeGreaterThan(0)
}, 30_000)

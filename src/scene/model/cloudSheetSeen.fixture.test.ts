import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { altitudeOf } from '../../world/field/project'
import { genusOf } from '../../world/field/genus'
import { gridFor, sheetAlphaAt } from './cloudSheetGrid'
import { gapStraightRun } from './cloudSheetGap.test-helper'
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

it.each(cases)('keeps relief rows intact for cells wholly below the join on %s at %s', (id, at) => {
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
    const cells = snapshot.cells.filter(cell =>
      altitudeOf(heightKm, Math.max(0, Math.hypot(cell.x, cell.y) - cell.r)) <= DOME_ALT)
    if (!cells.length) continue
    const shaped = cloudSheetOf(world, geom, { ...snapshot, cells }, colours)!
    expect(grid.tau.slice(start, end)).toEqual(roundTau)
    expect(shaped.alpha.slice(start)).toEqual(round.alpha.slice(start))
    expect(shaped.tone.slice(start)).toEqual(round.tone.slice(start))
    // The lowest raster interval borders the skyline. A full snapshot may
    // change straddling silhouettes but keeps the horizon texels intact.
    const full = cloudSheetOf(world, geom, snapshot, colours)!
    const horizon = end - 2 * round.xs.length
    expect(full.alpha.slice(horizon)).toEqual(round.alpha.slice(horizon))
    expect(full.tone.slice(horizon)).toEqual(round.tone.slice(horizon))
    count++
  }
  expect(count).toBeGreaterThan(0)
}, 30_000)

it('breaks up the straight alpha contour of the Neve Zohar gap at 16:00', () => {
  const [id, at] = cases[0]
  const world = buildWorld(worldInput(places.get(id)!, at, at))
  const geom = skyGeom(world, box)
  const width = box.width * box.dpr
  const height = Math.floor(geom.horizon * box.dpr)
  const measure = (shaped: boolean) => {
    const sheets = world.cloudField!.snapshot.flatMap(snapshot => {
      const sheet = cloudSheetOf(world, geom, shaped ? snapshot : { ...snapshot, cells: [] }, colours)
      return sheet ? [sheet] : []
    })
    const mask = Uint8Array.from({ length: width * height }, (_, i) => {
      const x = (i % width + 0.5) / box.dpr, y = (Math.floor(i / width) + 0.5) / box.dpr
      return Number(sheets.reduce((clear, sheet) => clear * (1 - sheetAlphaAt(sheet, x, y)), 1) > 0.75)
    })
    // Centre of the reported x=90..320, y=345..520 region in the 2× still.
    return gapStraightRun(mask, width, 205, 432)
  }
  expect(measure(false)).toBeGreaterThan(0.2)
  expect(measure(true)).toBeLessThanOrEqual(0.2)
}, 30_000)

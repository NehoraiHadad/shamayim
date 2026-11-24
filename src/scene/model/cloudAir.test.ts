import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/minutes'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { edgeNoise } from '../../world/field/edges'
import { altitudeOf } from '../../world/field/project'
import { makeWorldBuilder } from '../../world/world'
import { airAt, withCloudAir } from './cloudAir'
import { sceneModel, skyLayers } from './index'
import { skyGeom, type SkyGeom } from './sky'
import { PLAIN_LIGHT } from './styleLight'
import type { CloudAir, LayerDesc, LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const START = '2026-11-17T11:55' as LocalTime, DRAG = 10
const FORCED = { forced: { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2 }, forcedLayers: { low: 0.6, mid: 0.6, high: 0.3 } }
const RAD = Math.PI / 180
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'haifa' || id === 'shadmot-mehola'))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

/** Haifa in the recorded wind, Shadmot Mehola in one that turns and changes its speed at every hour. */
function worldsOf(id: string) {
  const base = worldInput(places.get(id)!, START, START), build = makeWorldBuilder()
  const hours = id === 'haifa' ? base.forecast.hours : base.forecast.hours.map((hour, i) =>
    ({ ...hour, windSpeed: 15 + 10 * (i % 3), windDirection: 40 * i % 360, windAloft: null }))
  const forecast = { ...base.forecast, hours }
  return (minute: number) => build({ ...base, ...FORCED, forecast, selected: addMinutes(START, minute) })
}
const sheetsOf = (layers: LayerDesc[]) => layers.filter((layer): layer is LayerOf<'cloudSheet'> => layer.kind === 'cloudSheet')
const turn = (a: number, b: number) => ((a - b + 540) % 360 + 360) % 360 - 180

/** Where the sheet's own nodes put a place of its air on the screen: linear between them, as a painter reads them. */
function onScreen(sheet: LayerOf<'cloudSheet'>, air: CloudAir, place: readonly number[]): [number, number] | null {
  const { xs, ys } = sheet
  const ground = (row: number, col: number) => airAt(air, row, col).map((v, k) => v + air.frames[0].d[k])
  const last = ys.length - 1
  const at = place.map((v, k) => v + air.frames[0].d[k]), range = Math.hypot(at[0], at[1])
  const bearing = (p: number[]) => Math.atan2(p[0], p[1]) / RAD
  const cols = xs.map((_, col) => turn(bearing(ground(last, col)), bearing(at)))
  const col = cols.findIndex((v, i) => i < xs.length - 1 && v * cols[i + 1] <= 0 && Math.abs(v - cols[i + 1]) < 30)
  const rows = ys.map((_, row) => Math.hypot(...(ground(row, 0) as [number, number])) - range)
  const row = rows.findIndex((v, i) => i < last && v <= 0 && rows[i + 1] > 0)
  if (col < 0 || row < 0) return null
  const part = (v: number, next: number) => v / (v - next)
  return [xs[col] + (xs[col + 1] - xs[col]) * part(cols[col], cols[col + 1]), ys[row] + (ys[row + 1] - ys[row]) * part(rows[row], rows[row + 1])]
}
const projected = (geom: SkyGeom, heightKm: number, x: number, y: number) =>
  [geom.x(Math.atan2(x, y) / RAD), geom.dome(altitudeOf(heightKm, Math.hypot(x, y)))]

it.each(['haifa', 'shadmot-mehola'])('keeps a mark on its cloud over a drag across an hour, at %s', (id) => {
  const worldAt = worldsOf(id)
  const marks = new Map<string, { lattice: string; place: number[]; from: number[]; noise: number }>()
  const found: Record<string, number> = {}
  let worst = 0, left = 0
  const asked = new Map<string, Set<string>>(), plain = new Map<string, Set<string>>()
  const note = (into: typeof plain, { id: of, key }: LayerDesc) => into.set(of, (into.get(of) ?? new Set()).add(key))
  for (let minute = 0; minute <= DRAG; minute++) {
    const world = worldAt(minute), geom = skyGeom(world, BOX)
    const layers = skyLayers(world, BOX)
    sheetsOf(layers).forEach((sheet) => note(plain, sheet))
    for (const sheet of sheetsOf(withCloudAir(layers, world, BOX, true))) {
      note(asked, sheet)
      if (sheet.genus !== 'sc' && sheet.genus !== 'ac') continue
      const air = sheet.air!, [{ d }] = air.frames
      const { cells, heightKm, layer } = world.cloudField!.snapshot.find((s) => s.layer?.lattice === sheet.lattice)!
      const noise = edgeNoise(world.place.id, layer!, world.cloudField!.field.t)
      for (const cell of cells) {
        const key = `${cell.id}`
        // Seeded where the cloud stands at the drag's first minute, and never moved after.
        if (!minute) marks.set(key, { lattice: sheet.lattice, place: [cell.x - d[0], cell.y - d[1]], from: [cell.x, cell.y], noise: noise.at(cell.x, cell.y) })
        const mark = marks.get(key)
        if (!mark) continue
        const ground = mark.place.map((v, k) => v + d[k])
        expect(Math.hypot(ground[0] - cell.x, ground[1] - cell.y), `${minute}`).toBeLessThan(1e-6)
        // The outline's noise goes with it.
        expect(noise.at(ground[0], ground[1]), `${minute}`).toBeCloseTo(mark.noise, 6)
        const seen = onScreen(sheet, air, mark.place)
        if (!seen) continue
        const [x, y] = projected(geom, heightKm, cell.x, cell.y), [oldX, oldY] = projected(geom, heightKm, mark.from[0], mark.from[1])
        worst = Math.max(worst, Math.hypot(seen[0] - x, seen[1] - y))
        left = Math.max(left, Math.hypot(oldX - x, oldY - y))
        if (minute === DRAG) found[mark.lattice] = (found[mark.lattice] ?? 0) + 1
      }
    }
  }
  console.info('CLOUD AIR', id, JSON.stringify({ found, worst, left }))
  expect(Object.values(found).reduce((sum, n) => sum + n, 0)).toBeGreaterThan(5)
  expect(worst).toBeLessThan(1)
  // A mark left where it was seeded, over the ground, is off by far more: the drag does move the clouds.
  expect(left).toBeGreaterThan(10)
  // Asking costs no repaint: a sheet's key changes as often with the air as without it.
  for (const [of, keys] of plain) expect(asked.get(of)!.size, of).toBe(keys.size)
}, 120_000)

it('gives each node the very rays the sheet is drawn by', () => {
  const world = worldsOf('haifa')(0), geom = skyGeom(world, BOX)
  const sheets = sheetsOf(withCloudAir(skyLayers(world, BOX), world, BOX, true))
  expect(sheets.length).toBeGreaterThan(1)
  for (const sheet of sheets) {
    const { heightKm } = world.cloudField!.snapshot.find((s) => s.layer?.lattice === sheet.lattice)!
    const air = sheet.air!, [{ d }] = air.frames
    expect([air.ranges.length, air.east.length, air.north.length]).toEqual([sheet.ys.length, sheet.xs.length, sheet.xs.length])
    for (const row of [1, sheet.ys.length >> 1, sheet.ys.length - 1]) for (const col of [0, sheet.xs.length - 1]) {
      const [x, y] = airAt(air, row, col).map((v, k) => v + d[k])
      expect(turn(Math.atan2(x, y) / RAD, geom.azimuthAt(sheet.xs[col]))).toBeCloseTo(0, 6)
      expect(altitudeOf(heightKm, Math.hypot(x, y))).toBeCloseTo(geom.domeAltitudeAt(sheet.ys[row]), 6)
    }
  }
})

it('leaves every descriptor and key as it is for a light that does not ask, and the rest for one that does', () => {
  const world = worldsOf('haifa')(0)
  const base = sceneModel(world, BOX).layers
  expect(base.some((layer) => 'air' in layer)).toBe(false)
  expect(withCloudAir(base, world, BOX, PLAIN_LIGHT.cloudAir)).toBe(base)
  const given = sceneModel(world, BOX, null, undefined, { ...PLAIN_LIGHT, cloudAir: true }).layers
  expect(sheetsOf(given).every(({ air }) => air)).toBe(true)
  expect(sheetsOf(given).map(({ key }) => key.replace(/:air:.*/, ''))).toEqual(sheetsOf(base).map(({ key }) => key))
  const direct = withCloudAir(base, world, BOX, true)
  direct.forEach((layer, i) => { if (layer.kind !== 'cloudSheet') expect(layer).toBe(base[i]) })
})
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { FAR_COLS, FAR_LAT_STEP, FAR_LON_STEP, FAR_ROWS, FAR_SOUTH, FAR_WEST } from '../data/city/farGrid'
import type { FarData } from '../data/city/farData'
import { loadPlaces, stubPublicFetch, type LoadedPlace } from '../test/sceneWorld'
import { SCENE_PLACES } from '../test/scenePlaces'
import { builtCells } from './builtCells'
import { placeEnvOf } from './placeEnv'
import { townLightsOf } from './townLights'

/* Where the towns' light stands at night: over their true bearings, more for the bigger and the nearer. */
const EYE = { lat: 31, lon: 35 }
const RAD = Math.PI / 180
const en = (azimuth: number, km: number): [number, number] => [km * Math.sin(azimuth * RAD), km * Math.cos(azimuth * RAD)]

/** A raster of the given towns only: wholly built squares `half` cells round a point at a bearing and distance from the eye. */
function townsAt(...towns: { azimuth: number; km: number; half: number }[]): FarData {
  const grid = new Uint8Array(FAR_ROWS * FAR_COLS)
  for (const { azimuth, km, half } of towns) {
    const [e, n] = en(azimuth, km)
    const r = Math.floor((EYE.lat + n / 110.57 - FAR_SOUTH) / FAR_LAT_STEP)
    const c = Math.floor((EYE.lon + e / (111.32 * Math.cos(EYE.lat * RAD)) - FAR_WEST) / FAR_LON_STEP)
    // A cell is ~1 km north to south and ~0.5 km across.
    for (let dr = -half; dr <= half; dr++) for (let dc = -2 * half; dc <= 2 * half; dc++) grid[(r + dr) * FAR_COLS + c + dc] = 15 << 4
  }
  return { grid, towers: [] }
}
const lights = (...towns: Parameters<typeof townsAt>) => townLightsOf(EYE, townsAt(...towns), 0)

it.each([20, 110, 235, 340])('stands a town’s dome of lit air over its true bearing, %d°', (azimuth) => {
  const { domes, toward } = lights({ azimuth, km: 20, half: 1 }).air()
  const off = ((domes[0].azimuth - azimuth + 540) % 360) - 180
  expect(Math.abs(off)).toBeLessThanOrEqual(5)
  expect(toward(azimuth).glow).toBeGreaterThan(20 * toward(azimuth + 180).glow)
  // Soft and wide: half of it a few degrees off, and most of it gone by 45°.
  expect(toward(azimuth + 5).glow).toBeGreaterThan(0.5 * toward(azimuth).glow)
  expect(toward(azimuth + 45).glow).toBeLessThan(0.1 * toward(azimuth).glow)
})

it('gives a bigger town and a nearer one the stronger dome, and the nearer the wider and higher', () => {
  const dome = (km: number, half: number) => lights({ azimuth: 90, km, half }).air().domes[0]
  expect(dome(20, 2).glow).toBeGreaterThan(dome(20, 1).glow)
  expect(dome(10, 1).glow).toBeGreaterThan(dome(20, 1).glow)
  expect(dome(4, 1).width).toBeGreaterThan(dome(30, 1).width)
  expect(dome(4, 1).height).toBeGreaterThan(dome(30, 1).height)
})

it('tells two towns apart, the brighter first', () => {
  const { domes } = lights({ azimuth: 60, km: 25, half: 1 }, { azimuth: 250, km: 12, half: 2 }).air()
  expect(Math.abs(domes[0].azimuth - 250)).toBeLessThanOrEqual(5)
  expect(domes.some((d) => Math.abs(d.azimuth - 60) <= 5)).toBe(true)
})

it('lights a base over the town itself, whichever way the base is seen', () => {
  const { under } = lights({ azimuth: 130, km: 14, half: 1 })
  const at = (azimuth: number, km: number) => under('low', ...en(azimuth, km))
  for (const [azimuth, km] of [[130, 6], [130, 24], [110, 14], [150, 14], [310, 14]]) {
    expect(at(130, 14), `${azimuth}° ${km} km`).toBeGreaterThan(4 * at(azimuth, km))
  }
  // A higher base is lit more widely and less.
  expect(under('high', ...en(130, 14))).toBeLessThan(at(130, 14))
  expect(under('high', ...en(310, 5))).toBeGreaterThan(at(310, 5))
})

it('keeps a far town’s own shape on the base: the exact sum of its cells, off the grid’s nodes too', () => {
  for (const [azimuth, km] of [[77, 23.6], [204, 50.3], [341, 87.7]] as const) {
    const far = townsAt({ azimuth, km, half: 2 }), { under } = townLightsOf(EYE, far, 0)
    const [e, n] = en(azimuth, km), cells = builtCells(EYE, far, 110)
    for (const [level, h] of [['low', 3], ['mid', 5]] as const) for (const [de, dn] of [[0, 0], [2.3, 0.7], [-1.1, -4.2]]) {
      const exact = cells.reduce((sum, c) => sum + c.area * h * h / (Math.PI * ((c.e - e - de) ** 2 + (c.n - n - dn) ** 2 + h * h) ** 2), 0)
      expect(Math.abs(under(level, e + de, n + dn) / exact - 1), `${level} ${azimuth}° ${km} km`).toBeLessThan(0.15)
    }
  }
})

it('is dark in the desert', () => {
  const none = lights()
  expect(none.under('low', 0, 0)).toBe(0)
  expect(none.air().domes).toEqual([])
  expect(none.air().even.glow).toBe(0)
})

it('falls back to the same light on every side without the raster', () => {
  const { air, under } = townLightsOf(EYE, null, 5)
  expect(air().domes).toEqual([])
  expect(air().toward(10)).toEqual(air().toward(200))
  expect(under('low', 3, 0)).toBe(under('low', 0, -8))
})

let loaded: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => ['jerusalem', 'tel-aviv', 'shadmot-mehola'].includes(p.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())
const real = (id: string) => {
  const p = loaded.get(id)!
  const env = placeEnvOf(p.place, p)
  return { env, lights: townLightsOf(p.place, p.far, env.glow) }
}

it('keeps the place’s whole sky glow: the bearings’ mean is env.glow', () => {
  for (const id of ['jerusalem', 'tel-aviv', 'shadmot-mehola']) {
    const { env, lights: { air } } = real(id)
    let sum = 0
    for (let a = 0; a < 360; a += 5) sum += air().toward(a).glow
    expect(sum / 72, id).toBeCloseTo(env.glow, 6)
  }
})

it('lights Tel Aviv’s sky over the land, not over the sea; Jerusalem’s on every side and overhead', () => {
  const telAviv = real('tel-aviv').lights
  expect(telAviv.under('low', ...en(90, 5))).toBeGreaterThan(5 * telAviv.under('low', ...en(290, 5)))
  expect(telAviv.air().toward(90).glow).toBeGreaterThan(1.5 * telAviv.air().toward(280).glow)
  const jerusalem = real('jerusalem').lights
  expect(jerusalem.under('low', 0, 0)).toBeGreaterThan(0.15)
  expect(jerusalem.air().even.glow).toBeGreaterThan(0.8 * real('jerusalem').env.glow)
  expect(real('shadmot-mehola').lights.under('low', 0, 0)).toBeLessThan(0.02)
})

import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { groundLighting, metalHorizon } from './buildingGround'
import { illustratedAirOf, illustratedHazeOf } from './illustratedHaze'
import { illustratedTonesAt } from './illustratedTones'
import { sceneModel } from './index'
import { landIrradiance, srgbRgbToLinear } from './landRadiance'
import { hazeOf } from './landVeil'
import { horizonBand, skyArch, skyGeom, skyGlows, skyStops } from './sky'
import { solarSkyGlows } from './skyGlows'
import { gradedWorld, ungradedWorld } from './skyTone'
import { PLAIN_LIGHT, type SkyGrade } from './styleLight'
import { mixRgb } from './tone'
import type { LayerDesc, LayerOf, RGB, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const MOMENTS = [['haifa', '2026-11-17T12:00'], ['haifa', '2026-11-17T16:30'], ['jerusalem', '2026-11-17T21:00']] as const
// Graded twice, a colour shows it.
const grade = (key: string, k: number): SkyGrade => ({ key, colour: ([r, g, b]) => [0.5 * r + k, 0.5 * g, 0.5 * b + 0.3] })
const A = grade('a', 0.1), B = grade('b', 0.2)
const once = (rgb: RGB) => A.colour(rgb, 0)
const modelOf = (world: WorldState, sky?: SkyGrade, clock: Parameters<typeof sceneModel>[2] = null) =>
  sceneModel(world, BOX, clock, undefined, { ...PLAIN_LIGHT, sky: { grade: sky } }).layers
const ofKind = <K extends LayerDesc['kind']>(layers: LayerDesc[], kind: K) => layers.filter((l): l is LayerOf<K> => l.kind === kind)

let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter(({ id }) => MOMENTS.some(([place]) => place === id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())
const worldAt = ([id, at]: readonly [string, (typeof MOMENTS)[number][1]]) => buildWorld(worldInput(places.get(id)!, at))

it('is nothing at all without a grade', () => {
  const world = worldAt(MOMENTS[0])
  expect(gradedWorld(world)).toBe(world)
  expect(ungradedWorld(world)).toBe(world)
  const plain = sceneModel(world, BOX).layers
  expect(modelOf(world)).toEqual(plain)
  expect(plain.some(({ key, light }) => `${key}${light?.key}`.includes('grade'))).toBe(false)
})

it.each(MOMENTS)('grades every colour of the sky once, %s %s', (...moment) => {
  const world = worldAt(moment), inked = gradedWorld(world, A)
  expect(gradedWorld(world, A)).toBe(inked)
  expect(skyStops(inked, BOX)).toEqual(skyStops(world, BOX).map(([at, rgb]) => [at, once(rgb)]))
  const geom = skyGeom(world, BOX)
  expect(skyGlows(inked, BOX, geom)).toEqual(skyGlows(world, BOX, geom).map((glow) => ({ ...glow, rgb: once(glow.rgb) })))
  if (world.night.dark === 0) expect(skyGlows(world, BOX, geom).length).toBeGreaterThan(0)
  expect(hazeOf(inked)).toEqual(once(hazeOf(world)))
  expect(illustratedHazeOf(inked)).toEqual(once(illustratedAirOf(world)))
  const band = horizonBand(inked, BOX)
  if (band) expect(band.rgb).toEqual(mixRgb(once(hazeOf(world)), [1, 1, 1], 0.12 * (1 - world.night.dark)))
  // The layers hold those colours, not their like: the sky's base, the planes' haze.
  const layers = modelOf(world, A), sky = ofKind(layers, 'sky')[0]
  expect(sky).toMatchObject({ stops: skyStops(inked, BOX), glow: skyGlows(inked, BOX, geom), band })
  for (const { light } of ofKind(layers, 'plane')) expect(light.litField.hazeLin).toEqual(srgbRgbToLinear(once(hazeOf(world))))
})

it('grades the arch, the sea\'s far edge and the mist in a land not known yet, and asks with the sun\'s altitude', () => {
  const noon = worldAt(MOMENTS[0])
  const clear = buildWorld({ ...worldInput(places.get('haifa')!, '2026-11-17T16:30'), forcedLayers: { low: 0, mid: 0, high: 0 } })
  const dusk = { ...clear, bodies: { ...clear.bodies, sun: { ...clear.bodies.sun, altitude: -2 } } }
  const arch = skyArch(dusk, BOX)!
  expect(skyArch(gradedWorld(dusk, A), BOX)).toEqual({ ...arch, shadowRgb: once(arch.shadowRgb), beltRgb: once(arch.beltRgb) })

  const far = (layers: LayerDesc[]) => ofKind(layers, 'water').flatMap(({ bands }) => bands.map(({ stops }) => stops[0][1]))
  expect(far(sceneModel(noon, BOX).layers).length).toBeGreaterThan(0)
  expect(far(modelOf(noon, A))).not.toEqual(far(sceneModel(noon, BOX).layers))

  const loading = { ...noon, terrain: { ...noon.terrain, status: 'loading' as const } }
  const reveal = { loadingAt: 0, reveal: { at: 1, fromHorizonY: noon.relief.horizonY, guessed: true } }
  const mist = (layers: LayerDesc[]) => layers.find(({ id }) => id === 'loading.mist')
  const before = mist(modelOf(loading, A))!, through = mist(modelOf(noon, A, reveal))!
  expect(before.key).toBe(through.key)
  expect(before).not.toMatchObject({ lit: (mist(sceneModel(loading, BOX).layers) as LayerOf<'loading'> & { lit: RGB }).lit })

  const asked = new Set<number>()
  modelOf(noon, { key: 'asks', colour: (rgb, altitude) => (asked.add(altitude), rgb) })
  expect([...asked]).toEqual([noon.bodies.sun.altitude])
})

it.each(MOMENTS)('leaves the light on things as it is, %s %s', (...moment) => {
  const world = worldAt(moment), inked = gradedWorld(world, A)
  expect(landIrradiance(inked)).toEqual(landIrradiance(world))
  expect(metalHorizon(inked)).toEqual(metalHorizon(world))
  expect(solarSkyGlows(inked, 0, 0, 1)).toEqual(solarSkyGlows(world, 0, 0, 1))
  expect(ungradedWorld(inked)).toMatchObject({ light: world.light })
  expect(skyStops(ungradedWorld(inked), BOX)).toEqual(skyStops(world, BOX))
  const air = srgbRgbToLinear(once(hazeOf(world))), ground = groundLighting(world)
  expect(groundLighting(inked)).toEqual({ buildings: { ...ground.buildings, air }, accents: { ...ground.accents, air } })
  const { wall, lit, shade, rim } = illustratedTonesAt(world, 0)
  expect(illustratedTonesAt(inked, 0)).toMatchObject({ wall, lit, shade, rim })
  const plain = ofKind(sceneModel(world, BOX).layers, 'plane')
  ofKind(modelOf(world, A), 'plane').forEach(({ light }, i) =>
    expect(light.litField).toEqual({ ...plain[i].light.litField, hazeLin: light.litField.hazeLin }))
})

it('keeps the hands\' bitmaps and memos apart, and the land\'s forms shared', () => {
  const world = worldAt(MOMENTS[1])
  const plain = sceneModel(world, BOX).layers, a = modelOf(world, A), b = modelOf(world, B)
  plain.forEach((layer, i) => {
    const keys = [layer, a[i], b[i]].map((one) => (one.light ? one.light.key : one.key))
    expect(new Set(keys).size, layer.id).toBe(3)
    if (layer.light) expect([a[i].key, b[i].key]).toEqual([layer.key, layer.key])
  })
  expect(sceneModel(world, BOX).layers).toEqual(plain)
  expect(modelOf(world, A)).toEqual(a)
  const bodies = (layers: LayerDesc[]) => JSON.stringify([ofKind(layers, 'cloudSheet'), ofKind(layers, 'cloudCells')])
  expect(bodies(a)).not.toBe(bodies(b))
})

import { describe, expect, it } from 'vitest'
import { SCENE_CAMERA, STORED_CAMERA } from '../../domain/camera'
import { makeNear, makeWorldInput, SHADMOT, typedCover } from '../../test/livingLandFixtures'
import { windOf } from '../../world/wind'
import { makeWorldBuilder } from '../../world/world'
import { formKeyOf } from '../compose/paintJob'
import { treeBend } from '../paint/landVegPose'
import { sceneModel } from '.'
import { canopyOf } from './canopy'
import { shadowedPlane } from './planeCloudShadow'
import { frameAt } from './anim'
import { dustPotential, landDustLayers } from './landDust'
import { LAND_GUST, plantWindAt, plantWindOf, treeTravel } from './landWind'
import type { LayerOf, SceneBox } from './types'
import { distanceFade, TREE_FULL_M_PER_PX, TREE_MAX_M_PER_PX } from './vegRules'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2.75 }
const DAY = '2026-11-17'
const input = makeWorldInput(SHADMOT, `${DAY}T12:00`, {
  cover: typedCover(1, 'worldcover-2021:local-50m'), near: makeNear(), far: null, weather: null,
})
const westerly = { cloudCover: 0, thickCloud: 0, weatherCode: 0, precipitation: 0, windSpeed: 60, windGusts: 90, windDirection: 270 }
const worldWind = (from: number, ms: number, gustMs: number, camera = SCENE_CAMERA) => windOf({
  speedKmh: ms * 3.6, gustKmh: gustMs * 3.6, shownFromDeg: from, directionSource: 'forced', forced: true,
}, camera).wind

describe('land plants in the scene wind', () => {
  it.each([['true', SCENE_CAMERA, 1], ['mirrored', STORED_CAMERA, -1]] as const)(
    'leans east and west with the wind in the %s view and stays upright in calm', (_, camera, eastSign) => {
      for (const [from, ms, gust, sign] of [[90, 15, 22, eastSign], [270, 15, 22, -eastSign], [270, 0, 0, 0]]) {
        const wind = plantWindOf(worldWind(from, ms, gust, camera))
        expect(Math.sign(treeBend(0, 9, 1, Math.PI, wind, 0) || 0)).toBe(sign)
        expect(Math.sign(treeBend(0, 9, 1, Math.PI, wind, 0.8) || 0)).toBe(sign)
      }
    },
  )

  it('grows with speed, saturates in a gale, and flexes the stronger branches less', () => {
    const mean = (ms: number) => plantWindOf(worldWind(90, ms, ms)).lean
    expect(mean(8)).toBeGreaterThan(mean(3))
    expect(mean(14)).toBeGreaterThan(mean(8))
    expect(mean(17.1)).toBe(mean(35))
    expect(plantWindOf(worldWind(90, 20, 32))).toEqual({ lean: 1, gust: 0.546875 })
    expect(treeTravel(3, 9)).toBeLessThan(treeTravel(0, 9))
    expect(treeTravel(1, 9)).toBe(treeTravel(0, 9))
    expect(treeTravel(0, 9)).toBeLessThan(treeTravel(2, 9))
  })

  it('uses gust excess, with no calm motion, and fades motion to zero at the distance cut', () => {
    const time = 0.8, seed = Math.PI
    const calm = plantWindOf(worldWind(90, 0.2, 0.2))
    expect(plantWindAt(calm, time, seed)).toBe(0)
    expect(plantWindAt(calm, 0, seed)).toBe(0)
    const steady = plantWindOf(worldWind(90, 14, 14))
    const gust = plantWindOf(worldWind(90, 14, 24))
    expect(plantWindAt(steady, time, seed)).toBe(steady.lean)
    expect(plantWindAt(gust, time, seed)).toBeGreaterThan(steady.lean)
    const travel = (mPerPx: number) => {
      const vis = distanceFade(mPerPx, TREE_FULL_M_PER_PX, TREE_MAX_M_PER_PX)
      return treeBend(0, 9, vis, seed, gust, time) - treeBend(0, 9, vis, seed, gust, 0)
    }
    expect(travel(28)).toBeGreaterThan(travel(44))
    expect(travel(44)).toBeGreaterThan(0)
    expect(travel(60)).toBe(0)
    expect(plantWindAt(gust, time, seed)).toBeCloseTo(plantWindAt(gust, time + 2, seed), 12)
    expect(plantWindAt(gust, time, 0)).not.toBe(plantWindAt(gust, time, 2 * Math.PI))
  })

  it('holds the land form across phases, hour scrub, and a change of wind', () => {
    const build = makeWorldBuilder()
    const noon = build({ ...input, forced: westerly })
    const at = (phase: number) => sceneModel(noon, BOX, { loadingAt: -phase }).layers
    const plant = (layers: ReturnType<typeof at>) => layers.find((l) => l.id === 'canopy.near')!
    const ground = (layers: ReturnType<typeof at>) => layers.find((l) => l.id === 'plane.near')!
    const first = at(0), next = at(0.8)
    const scrub = sceneModel(build({ ...input, selected: `${DAY}T13:00`, forced: westerly }), BOX).layers
    const calm = sceneModel(build({ ...input, forced: { ...westerly, windSpeed: 0, windGusts: 0 } }), BOX).layers
    expect(frameAt(plant(first).animated, 0.8)).not.toBe(frameAt(plant(first).animated, 0))
    expect(formKeyOf(plant(next), BOX.dpr)).toEqual(formKeyOf(plant(first), BOX.dpr))
    expect(formKeyOf(plant(scrub), BOX.dpr)).toEqual(formKeyOf(plant(first), BOX.dpr))
    expect(plant(scrub).light?.key).not.toBe(plant(first).light?.key)
    expect(plant(calm).animated).toBeUndefined()
    expect(formKeyOf(ground(calm), BOX.dpr)).toEqual(formKeyOf(ground(first), BOX.dpr))
  })
})

describe('wind-blown land dust', () => {
  const bare = { cover: 6, ndvi: 0.09, dryness: 0.95 }
  it('requires strong wind, bare cover, low NDVI and dry soil', () => {
    expect(dustPotential(8, bare)).toBe(0)
    expect(dustPotential(14, bare)).toBeGreaterThan(dustPotential(9, bare))
    expect(dustPotential(14, { ...bare, ndvi: 0.16 })).toBe(0)
    expect(dustPotential(14, { ...bare, dryness: 0.72 })).toBe(0)
    for (const cover of [null, 2, 4, 5, 7, 8]) expect(dustPotential(14, { ...bare, cover })).toBe(0)
  })

  it('drifts a low tile and a weaker far veil with the same camera sign', () => {
    const world = makeWorldBuilder()({ ...input, forced: westerly })
    const land = {
      ...world.land,
      own: { ...world.land.own, ...bare },
      rays: world.land.rays.map((ray) => ({
        ...ray, bands: ray.bands.map((band) => ({ ...band, sample: { ...band.sample, ...bare } })),
      })),
    }
    const layers = landDustLayers({ ...world, land }, BOX)
    expect(layers.map((l) => l.id)).toEqual(['landDust.far', 'landDust.near'])
    expect(layers[1].animated?.fall?.vx).toBeLessThan(0)
    // Horizontal dust advection scales linearly with widthScale (box.width / SCENE_W) in CSS px/s.
    const wide = landDustLayers({ ...world, land }, { ...BOX, width: BOX.width * 2 })
    expect(wide[1].animated!.fall!.vx).toBeCloseTo(layers[1].animated!.fall!.vx * 2, 10)
    expect(Math.max(...layers[0].animated!.fall!.alphas!)).toBeLessThan(Math.max(...layers[1].animated!.fall!.alphas!))
    const mirrored = { ...world, land, wind: worldWind(270, 16, 24, STORED_CAMERA) }
    expect(landDustLayers(mirrored, BOX)[1].animated?.fall?.vx).toBeGreaterThan(0)
  })
})

it('keeps the gust loop and byte-keyed canopy light under moving cloud shadows', () => {
  const world = makeWorldBuilder()({ ...input, forced: westerly })
  const plane = sceneModel(world, BOX).layers.find((layer): layer is LayerOf<'plane'> => layer.kind === 'plane' && layer.plane === 'near')!
  const gust = { lean: 0.7, gust: 0.5 }
  const shadow = { plane: 'near', open: 0.8, blobs: [
    { cellId: 'test', centre: [100, 100], x: 100, y: 100, rx: 40, ry: 30, speed: 1, opticalDepth: 2 },
  ] } as const
  const moving = shadowedPlane(plane, { ...shadow, blobs: [...shadow.blobs] }, 15)
  expect(moving.cloudShadow?.speed).toBe(1)
  expect(moving.animated?.frames).toBeUndefined()
  const canopy = canopyOf(moving, gust, [])!
  expect(canopy.animated?.frames).toEqual(LAND_GUST)
  expect(frameAt(canopy.animated, 15.4)).toBe(frameAt(canopy.animated, 17.4))
  const renamed = canopyOf({ ...moving, light: { ...moving.light, key: 'new plane generation' } }, gust, [])!
  expect(renamed.light?.key).toBe(canopy.light?.key)
})

import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { apparentSunAltitude } from '../../world/skyProjection'
import type { WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { STYLES } from '../paint/styles'
import { sceneModel } from './index'
import { lampOf, withLamp } from './lamp'
import { clearNoonBeamShare } from './landIrradiance'
import { skyGeom } from './sky'
import { PLAIN_LIGHT } from './styleLight'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const TIMES = ['2026-11-17T12:00', '2026-11-17T16:45', '2026-11-17T21:00'] as const
const IDS = ['haifa', 'jerusalem', 'shadmot-mehola']
const KINDS = ['cloudSheet', 'plane', 'canopy', 'water'] as const
const ASKED = { ...PLAIN_LIGHT, lamp: KINDS }
const DECK = { low: 1, mid: 0, high: 0 }
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter(({ id }) => IDS.includes(id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const inputAt = (id = 'haifa', at: LocalTime = TIMES[0]) => worldInput(places.get(id)!, at)
const sheetWorld = () => buildWorld({ ...inputAt(), forcedLayers: DECK })

function atSun(world: WorldState, apparent: number, azimuth = world.bodies.sun.azimuth): WorldState {
  // Recover the geometric input using the same refraction law. Below −1° refraction is held constant.
  let altitude = apparent
  for (let i = 0; i < 24; i++) altitude += apparent - apparentSunAltitude(altitude)
  const moon = { ...world.bodies.moon, altitude: 20, illumination: 1 }
  return { ...world, bodies: { sun: { ...world.bodies.sun, altitude, azimuth }, moon } }
}

it.each(IDS)('leaves descriptors untouched when the styles omit lamp at %s', (id) => {
  for (const time of TIMES) {
    const world = buildWorld(inputAt(id, time))
    for (const light of [PLAIN_LIGHT, STYLES.real.light, STYLES.drawn.light]) {
      const layers = sceneModel(world, BOX, null, undefined, light).layers
      for (const layer of layers) expect(layer).not.toHaveProperty('lamp')
      expect(withLamp(layers, world, BOX, light.lamp)).toBe(layers)
    }
  }
})

it('attaches lamps selectively, keeps untouched descriptors, and supports loading skies', () => {
  const world = sheetWorld()
  const base = sceneModel(world, BOX).layers
  const asked = sceneModel(world, BOX, null, undefined, ASKED).layers
  for (const kind of KINDS) {
    expect(asked.some(layer => layer.kind === kind)).toBe(true)
    const changed = withLamp(base, world, BOX, [kind])
    changed.forEach((layer, i) => {
      if (layer.kind === kind) expect(layer).toHaveProperty('lamp.body', 'sun')
      else expect(layer).toBe(base[i])
    })
  }
  expect(asked.filter(layer => 'lamp' in layer).map(layer => layer.id))
    .toEqual(base.filter(layer => KINDS.some(kind => kind === layer.kind)).map(layer => layer.id))
  const loading = { ...world, terrain: { ...world.terrain, status: 'loading' as const } }
  const lamps = sceneModel(loading, BOX, null, undefined, ASKED).layers.filter(layer => 'lamp' in layer)
  expect(lamps.length).toBeGreaterThan(0)
  expect(lamps.every(layer => layer.kind === 'cloudSheet')).toBe(true)
})

it('selects by apparent altitude and retains the twilight sun only through −12°', () => {
  const world = buildWorld(inputAt())
  const at = (alt: number) => lampOf(atSun(world, alt), BOX)?.('sky')
  for (const altitude of [30, 0, -3.9]) {
    expect(at(altitude)?.body).toBe('sun')
    expect(at(altitude)).not.toHaveProperty('sun')
  }
  expect(at(-4.1)).toMatchObject({ body: 'moon', sun: { altitude: -4 } })
  expect(at(-12.1)).not.toHaveProperty('sun')
  const withoutMoon = (alt: number) => {
    const { bodies } = atSun(world, alt)
    return lampOf({ ...world, bodies: { ...bodies, moon: { ...bodies.moon, illumination: 0 } } }, BOX)?.('sky')
  }
  for (const altitude of [-4.1, -8, -11.9])
    expect(withoutMoon(altitude)).toMatchObject({ body: 'sun', strength: 0, altitude: Math.round(altitude * 2) / 2 })
  expect(withoutMoon(-12.1)).toBeUndefined()
  const night = atSun(world, -30)
  expect(lampOf({ ...night, bodies: { ...night.bodies, moon: { ...night.bodies.moon, altitude: NaN } } }, BOX)).toBeUndefined()
  expect(lampOf({ ...night, bodies: { ...night.bodies, moon: { ...night.bodies.moon, illumination: 0 } } }, BOX)).toBeUndefined()
})

it('uses the attenuated direct beam and zeroes it below the horizon and under the opaque deck', () => {
  const clear = buildWorld({ ...inputAt(), forcedLayers: { low: 0, mid: 0, high: 0 } })
  const strength = (world: WorldState, alt: number) => lampOf(atSun(world, alt), BOX)!('sky').strength
  expect(strength(clear, 60)).toBeGreaterThan(strength(clear, 10))
  expect(strength(clear, 10)).toBeGreaterThan(0)
  expect(strength(clear, -1)).toBe(0)
  expect(strength(sheetWorld(), 30)).toBe(0)
})

it('keeps a full moon at 40° visible in its night exposure, independent of ground wetness', () => {
  const clear = buildWorld({ ...inputAt(), forcedLayers: { low: 0, mid: 0, high: 0 } })
  const noon = atSun(clear, 90)
  const zenith = { ...noon, air: { ...noon.air, visibilityKm: 30, dustWeight: 0 },
    bodies: { ...noon.bodies, sun: { ...noon.bodies.sun, altitude: 90 } } }
  expect(clearNoonBeamShare(zenith, 'sun')).toBe(1)
  const moonAtNight = (world: WorldState, wet: number) => {
    const { bodies } = atSun(world, -30)
    return lampOf({ ...world, ground: { ...world.ground, wet },
      bodies: { ...bodies, moon: { ...bodies.moon, altitude: 40 } } }, BOX)!('sky')
  }
  const moon = moonAtNight(clear, 0)
  expect(moon.body).toBe('moon')
  expect(moon.strength).toBeGreaterThan(0)
  expect(moon.strength).toBeLessThan(lampOf(zenith, BOX)!('sky').strength)
  expect(moonAtNight(clear, 1).strength).toBe(moon.strength)
  expect(moonAtNight(sheetWorld(), 0).strength).toBe(0)
})

it('registers sky and land coordinates at each width, including a wide sky and the rear seam', () => {
  const world = buildWorld(inputAt())
  for (const width of [320, 375, 430]) for (const landLeft of [0, 216, 217]) {
    const box = { ...BOX, width, skyWidth: width + 2 * landLeft, landLeft, landTop: landLeft === 217 ? 301 : 300 }
    for (const [azimuth, side] of [[359, 1], [1, -1]]) {
      const placed = atSun(world, 30, azimuth)
      const geom = skyGeom(placed, box)
      const project = lampOf(placed, box)!
      const sky = project('sky'), land = project('land')
      expect(Math.sign(land.x - width / 2)).toBe(side * world.camera.handed)
      const points = { x: geom.x(azimuth), y: geom.y(30), domeY: geom.dome(30) }
      for (const axis of ['x', 'y', 'domeY'] as const) {
        const origin = axis === 'x' ? geom.left : geom.horizon - world.relief.y(0)
        const stride = 2 * width / 375
        const gridIndex = Math.round((points[axis] - origin) / stride)
        const devicePoint = Math.round((origin + gridIndex * stride) * box.dpr)
        expect(sky[axis]).toBe(devicePoint / box.dpr)
        expect(land[axis]).toBe(devicePoint / box.dpr - origin)
      }
      expect(sky.domeY).toBeLessThan(sky.y)
    }
  }
})

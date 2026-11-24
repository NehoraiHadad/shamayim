import { Session } from 'node:inspector/promises'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES, DATUM_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { transmitAlong } from '../../world/field/transmit'
import { makeWorldBuilder } from '../../world/world'
import { sceneModel } from './index'
import type { SceneBox } from './types'

/* A probe, to be removed. */
const ids = ['haifa', 'tel-aviv', 'shadmot-mehola']
const box: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2.75 }
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter((place) => ids.includes(place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const SHOWERS = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45, windDirection: 250, humidity: 80 }

it('dumps the showers', () => {
  const at = '2026-11-17T12:00' as LocalTime
  const world = makeWorldBuilder()({ ...worldInput(places.get('haifa')!, at, at), forced: SHOWERS })
  const { field, snapshot } = world.cloudField!
  const { azimuth, altitude } = world.bodies.sun
  console.info('DUMP sun', azimuth, altitude, 'T', transmitAlong(field, snapshot, azimuth, altitude), snapshot.map((s) => [s.layer?.lattice, transmitAlong(field, [s], azimuth, altitude)]),
    'eye', world.light.eye, 'clear', world.light.clear, 'moon', world.bodies.moon.up, world.bodies.moon.altitude)
  for (const layer of sceneModel(world, box).layers) {
    if (layer.kind === 'cloudSheet') {
      const { xs, ys, alpha, tone, body, shade, lit, genus, id } = layer
      const rows: string[] = []
      for (let r = 0; r < ys.length; r += 4) if (ys[r] > 20 && ys[r] < 300) {
        const pick = (list: number[]) => [60, 125, 170, 190, 215, 250, 330].map((x) => list[r * xs.length + Math.round(x / (xs[1] - xs[0]))].toFixed(3)).join(' ')
        rows.push(`y ${ys[r].toFixed(0)} a ${pick(alpha)} | t ${pick(tone)}`)
      }
      console.info('DUMP', id, genus, 'cover', snapshot.find((s) => s.layer?.lattice === layer.lattice)?.layer?.cover,
        JSON.stringify({ body, shade, lit }), '\n' + rows.join('\n'))
    }
    if (layer.kind === 'cloudCells') console.info('DUMP towers', JSON.stringify(layer.cells.map(({ sprite: s, x, y }) => [x, y, s.genus, s.w, s.tall, s.under, s.tau, s.share, s.anvil, s.body, s.shade].map((v) => typeof v === 'number' ? +v.toFixed(2) : v))))
  }
})

it('profiles a scrub', async () => {
  const frames = ids.map((id) => {
    const input = worldInput(places.get(id)!, '2026-11-17T06:00', '2026-11-17T06:00'), build = makeWorldBuilder()
    return Array.from({ length: 120 }, (_, i) => () => build({ ...input, selected: addMinutes('2026-11-17T06:00' as LocalTime, 6 * i) }))
  })
  for (const place of frames) for (const frame of place.slice(0, 40)) sceneModel(frame(), box)
  const session = new Session()
  session.connect()
  await session.post('Profiler.enable')
  await session.post('Profiler.setSamplingInterval', { interval: 200 })
  let world = 0, model = 0
  const worlds = frames.flatMap((place) => place.map((frame) => {
    const start = performance.now(), built = frame()
    world += performance.now() - start
    return built
  }))
  await session.post('Profiler.start')
  for (const built of worlds) {
    const start = performance.now()
    sceneModel(built, box)
    model += performance.now() - start
  }
  const { profile } = await session.post('Profiler.stop')
  const self = new Map<string, number>(), byId = new Map(profile.nodes.map((node) => [node.id, node]))
  profile.samples!.forEach((id, i) => {
    const { functionName, url, lineNumber } = byId.get(id)!.callFrame
    const key = `${functionName || '(anon)'} ${url.split('/').slice(-2).join('/')}:${lineNumber + 1}`
    self.set(key, (self.get(key) ?? 0) + profile.timeDeltas![i] / 1000)
  })
  console.info('PROFILE world', world.toFixed(0), 'model', model.toFixed(0), 'ms over', worlds.length, 'frames\n'
    + [...self].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([key, ms]) => `PROF ${ms.toFixed(1)} ${key}`).join('\n'))
  expect(model).toBeGreaterThan(0)
}, 240_000)

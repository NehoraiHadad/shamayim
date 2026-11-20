import { beforeAll, describe, expect, it } from 'vitest'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { AirInput } from '../../atmo/airTypes'
import { SCENE_PLACES } from '../../test/scenePlaces'
import type { LocalTime } from '../../domain/types'
import { buildWorld } from '../../world/world'
import { trackAt } from './anim'
import { sceneModel } from './index'
import { landTopOf } from './life'
import { skyGeom } from './sky'
import type { LayerDesc, LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const CLEAR: Partial<AirInput> = { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 }
const SHOWERS: Partial<AirInput> = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45,
  windDirection: 250, humidity: 80 }
const RAIN: Partial<AirInput> = { precipitation: 4, weatherCode: 63, cloudCover: 95, thickCloud: 90, windSpeed: 35, windGusts: 55, windDirection: 270,
  humidity: 95 }

let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces()
}, 120_000)

function at(id: string, when: LocalTime, forced: Partial<AirInput> | null = null) {
  const world = buildWorld({ ...worldInput(places.get(id)!, when), forced })
  return { world, model: sceneModel(world, BOX) }
}
const ofKind = <K extends LayerDesc['kind']>(layers: readonly LayerDesc[], kind: K) => layers.filter((l): l is LayerOf<K> => l.kind === kind)

describe('C10: the sky life in the model', () => {
  it('keeps every flock and every low plane above the land and what stands on it, at phase 0', () => {
    let seen = 0
    for (const place of SCENE_PLACES) {
      for (const hour of ['07:30', '12:00', '16:00']) {
        const { world, model } = at(place.id, `2026-11-17T${hour}`)
        const top = landTopOf(world, BOX, skyGeom(world, BOX), model.layers.filter((l) => l.surface === 'land'))
        for (const a of ofKind(model.layers, 'aircraft').filter((p) => p.id.startsWith('aircraft.low'))) {
          seen++
          expect(a.y, `${a.id} at ${place.id} ${hour}`).toBeLessThanOrEqual(top(a.x))
        }
        for (const l of ofKind(model.layers, 'birds')) {
          seen++
          const off = trackAt(l.animated?.flight, 0, true)!
          for (const x of [l.bounds.x + 2, l.bounds.x + l.bounds.w / 2, l.bounds.x + l.bounds.w - 2]) {
            if (x < 0 || x > BOX.width) continue
            expect(l.bounds.y + off.y + l.bounds.h, `${l.id} at ${place.id} ${hour}`).toBeLessThanOrEqual(top(x) + 3)
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(5)
  })

  it('has no birds in heavy rain', () => {
    for (const id of ['haifa', 'jerusalem', 'tiberias']) expect(ofKind(at(id, '2026-11-17T12:00', RAIN).model.layers, 'birds')).toEqual([])
  })

  it('flies a flock across at its true angular speed, wing beats on a strip that loops', () => {
    const birds = ofKind(at('tel-aviv', '2026-11-17T07:30').model.layers, 'birds')
    expect(birds.length).toBeGreaterThan(0)
    for (const b of birds) {
      const frames = b.animated!.frames!
      expect(b.flap * b.loop).toBeCloseTo(Math.round(b.flap * b.loop), 6)
      expect(frames.count / frames.fps).toBeCloseTo(b.loop, 6)
      const track = b.animated!.flight
      if (track) expect(trackAt(track, 0)).toEqual({ x: expect.closeTo(0, 6), y: expect.closeTo(0, 6) })
    }
  })

  it('draws contrails only when the air at cruise makes them', () => {
    for (const id of ['jerusalem', 'haifa']) {
      for (const hour of ['09:00', '13:00']) {
        const { world, model } = at(id, `2026-11-17T${hour}`)
        const trails = ofKind(model.layers, 'contrail')
        if (!world.life.aircraft.cruise.forms) expect(trails).toEqual([])
        if (!world.life.aircraft.cruise.persists) expect(trails.filter((t) => t.id.startsWith('contrail.old'))).toEqual([])
      }
    }
  })
})

describe('C10: the night sky in the model', () => {
  it('shows Jupiter and Mars over Rosh Pina on the Geminids morning, steady (no animation); none by day', () => {
    const { world, model } = at('rosh-pina', '2026-12-14T02:00', CLEAR)
    const planets = ofKind(model.layers, 'planets')[0]
    expect(planets.planets.map((p) => p.name)).toEqual(expect.arrayContaining(['jupiter', 'mars']))
    expect(planets.animated).toBeUndefined()
    const geom = skyGeom(world, BOX)
    const jupiter = world.nightSky.planets.find((p) => p.name === 'jupiter')!
    expect(planets.planets.find((p) => p.name === 'jupiter')!.x).toBeCloseTo(geom.x(jupiter.azimuth), 6)
    expect(ofKind(at('rosh-pina', '2026-12-14T12:00', CLEAR).model.layers, 'planets')).toEqual([])
  })

  it('twinkles the brightest stars on strips; the planets never', () => {
    const { model } = at('ramon-crater', '2026-12-14T02:00', CLEAR)
    const twinkle = ofKind(model.layers, 'twinkle')
    expect(twinkle.length).toBeGreaterThan(0)
    for (const t of twinkle) expect(t.animated?.frames?.count).toBeGreaterThan(1)
  })

  it('draws meteors only on a shower night', () => {
    expect(ofKind(at('ramon-crater', '2026-12-14T02:00', CLEAR).model.layers, 'meteor').length).toBeGreaterThan(0)
    expect(ofKind(at('ramon-crater', '2026-06-20T02:00', CLEAR).model.layers, 'meteor')).toEqual([])
  })

  it('shows the Milky Way at Ramon on a moonless August night and never in Tel Aviv', () => {
    expect(ofKind(at('ramon-crater', '2026-08-12T23:30', CLEAR).model.layers, 'milkyWay')).toHaveLength(1)
    expect(ofKind(at('tel-aviv', '2026-08-12T23:30', CLEAR).model.layers, 'milkyWay')).toEqual([])
  })
})

describe('C10: optics in the model', () => {
  it('draws a rainbow in afternoon showers with the sun low in the west, none at noon (the bow behind the eye) nor in steady rain', () => {
    const late = at('haifa', '2026-11-17T15:30', SHOWERS)
    expect(late.world.optics.rainbow).not.toBeNull()
    expect(ofKind(late.model.layers, 'bow').some((b) => b.look === 'rainbow')).toBe(true)
    expect(ofKind(at('haifa', '2026-11-17T12:00', SHOWERS).model.layers, 'bow').some((b) => b.look === 'rainbow')).toBe(false)
    expect(at('haifa', '2026-11-17T15:30', RAIN).world.optics.rainbow).toBeNull()
  })

  it('rings the drawn sun with the halo under a cirrostratus veil', () => {
    const world = buildWorld({ ...worldInput(places.get('jerusalem')!, '2026-11-17T11:00'), forced: { cloudCover: 75, thickCloud: 0, precipitation: 0,
      weatherCode: 2 }, forcedLayers: { low: 0, mid: 0, high: 0.75 } })
    const model = sceneModel(world, BOX)
    const halo = ofKind(model.layers, 'bow').find((b) => b.look === 'halo')!
    const sx = world.bodies.sun.x, sy = BOX.landTop + world.bodies.sun.y
    // A circle round the drawn sun, well away from the disc (its ring at 22° in px of the sky's scale there).
    expect(halo.cx).toBeCloseTo(sx, 6)
    expect(halo.cy).toBeCloseTo(sy, 6)
    expect(22 * halo.k).toBeGreaterThan(25)
  })
})

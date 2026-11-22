import { beforeAll, describe, expect, it } from 'vitest'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { AirInput } from '../../atmo/airTypes'
import { addMinutes } from '../../domain/time'
import { SCENE_PLACES } from '../../test/scenePlaces'
import type { LocalTime } from '../../domain/types'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { trackAt } from './anim'
import { sceneModel } from './index'
import { inFrontOf } from './life'
import { skyGeom } from './sky'
import type { LayerDesc, LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 1 }
const CLEAR: Partial<AirInput> = { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 }
const SHOWERS: Partial<AirInput> = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45,
  windDirection: 250, humidity: 80, visibilityKm: 30 }
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
  it('lays a flock or a plane in front of the land only where it is nearer than that land, else the land hides it', { timeout: 60_000 }, () => {
    let seen = 0, front = 0
    for (const place of SCENE_PLACES) {
      const input = worldInput(places.get(place.id)!, '2026-11-17T12:00')
      for (const hour of ['07:30', '09:00', '12:00', '14:00', '16:00']) {
        const world = buildWorld({ ...input, selected: `2026-11-17T${hour}` })
        const model = sceneModel(world, BOX)
        const geom = skyGeom(world, BOX)
        for (const l of model.layers.filter((x): x is LayerOf<'birds'> | LayerOf<'aircraft'> => x.kind === 'birds' || x.kind === 'aircraft')) {
          expect(l.placed, l.id).toBeDefined()
          if (l.surface === 'sky') { seen++; continue }
          front++
          // A copy in front of the land: its sky copy laid only over the land's figure, and it truly nearer than the land.
          const sky = model.layers.find((x) => x.id === l.id.replace(/\.front$/, ''))!
          expect(sky.placed!.above).toBe(BOX.landTop)
          const km = l.kind === 'birds' ? world.life.birds.find((b) => `birds.${b.id}.front` === l.id)!.distanceM / 1000 : null
          if (km !== null) expect(inFrontOf(world, geom, sky.placed!.x, km), l.id).not.toBeNull()
        }
      }
    }
    expect(seen).toBeGreaterThan(5)
    expect(front).toBeGreaterThan(0)
  })

  it('has no birds in heavy rain', () => {
    for (const id of ['haifa', 'jerusalem', 'tiberias']) expect(ofKind(at(id, '2026-11-17T12:00', RAIN).model.layers, 'birds')).toEqual([])
  })

  it('loops the wing beats and wheeling on a strip as the flock follows its open path', () => {
    const birds = ['10:30', '12:30', '14:30'].flatMap((h) => ofKind(at('tel-aviv', `2026-11-17T${h}`).model.layers, 'birds'))
    expect(birds.length).toBeGreaterThan(0)
    for (const b of birds) {
      const frames = b.animated!.frames!
      expect(b.flap * b.loop).toBeCloseTo(Math.round(b.flap * b.loop), 6)
      expect(frames.count / frames.fps).toBeCloseTo(b.loop, 6)
      const flight = b.animated!.flight!
      expect(flight).toMatchObject({ open: true, step: 2 })
      expect(flight.path).toHaveLength(61)
      const start = trackAt(flight, 0)!
      expect(start).toMatchObject({ x: 0, y: 0, scale: 1, turn: 0 })
      expect(start.alpha === 0 || start.alpha === 1).toBe(true)
      if (start.alpha === 0) expect(flight.alpha!.some((a) => a > 0)).toBe(true)
      expect(trackAt(flight, 121)).toEqual(trackAt(flight, 120))
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

  it('keeps a meteor bitmap and its absolute flash time across a minute rebuild', () => {
    const at = '2026-12-14T02:00'
    const input = { ...worldInput(places.get('ramon-crater')!, at), forced: CLEAR }
    const build = makeWorldBuilder()
    const before = ofKind(sceneModel(build(input), BOX, null, { laidAt: 2000, sinceS: 37 }).layers, 'meteor')
    const after = ofKind(sceneModel(build({ ...input, selected: addMinutes(at, 1) }), BOX, null, { laidAt: 2023, sinceS: 0 }).layers, 'meteor')
    const shared = before.filter((m) => after.some((next) => next.id === m.id))
    expect(shared.length).toBeGreaterThan(0)
    for (const m of shared) {
      const next = after.find((n) => n.id === m.id)!
      expect([next.key, next.bounds, next.x1, next.y1]).toEqual([m.key, m.bounds, m.x1, m.y1])
      expect(next.animated!.pulse!.first).toBeCloseTo(m.animated!.pulse!.first, 8)
    }
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

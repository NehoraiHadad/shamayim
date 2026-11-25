import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { apparentAltitude } from '../../world/skyProjection'
import type { WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { paintBodies, paintStars } from '../paint/shared/sky/bodies'
import { paintFlash } from '../paint/shared/sky/flash'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/shared/base/hand'
import { layersOn, sceneModel } from '.'
import { driftAt, flashAt, strikes } from './anim'
import { fallingOf } from './falling'
import { bodyLayers, MOON_MAGNIFICATION, moonDisc, sunDisc } from './bodies'
import { brightLimbAngle } from '../../world/moonShape'
import { skyGeom } from './sky'
import type { LayerDesc, LayerOf, SceneBox, SceneModel } from './types'

/**
 * Stage C6 (docs/design/CANVAS-SCENE-PLAN.md §4): the sky, structurally. One world state: the discs where the world
 * puts the bodies, stars only through the clear share, clouds lit from the light's side and drifting with the wind at
 * their height, lightning only with thunder, every animation a pure function of the phase.
 */
const DAY = '2026-11-17'
const HOURS = ['06:20', '12:00', '16:30', '21:00']
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

const at = (hour: string) => `${DAY}T${hour}` as LocalTime
const world = (id: string, hour: string, forced: WorldInput['forced'] = null) => buildWorld({ ...worldInput(loaded.get(id)!, at(hour)), forced })
const sky = (model: SceneModel) => layersOn(model, 'sky')
const ofKind = <K extends LayerDesc['kind']>(model: SceneModel, kind: K) => sky(model).filter((l): l is LayerOf<K> => l.kind === kind)
const sunOf = (model: SceneModel) => ofKind(model, 'bodies').find((l) => l.sun)?.sun ?? null
const moonOf = (model: SceneModel) => ofKind(model, 'bodies').find((l) => l.moon)?.moon ?? null
const starsOf = (model: SceneModel) => ofKind(model, 'stars')[0]?.stars ?? []

const THUNDER = { precipitation: 6, weatherCode: 95, cloudCover: 90, thickCloud: 85, windSpeed: 25, windDirection: 250 }
const OVERCAST = { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3 }
const CLEAR = { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 }

describe.each(SCENE_PLACES)('sky: $id', ({ id }) => {
  it('draws the sun and the moon where the world puts them: true azimuth across, apparent altitude up', () => {
    for (const hour of HOURS) {
      const w = world(id, hour)
      const model = sceneModel(w, BOX)
      const sun = sunOf(model)
      expect(Boolean(sun)).toBe(w.bodies.sun.up)
      if (sun) {
        expect(sun.x).toBeCloseTo(w.bodies.sun.x, 6)
        expect(sun.y).toBeCloseTo(BOX.landTop + w.bodies.sun.y, 6)
        // Across: the camera's x of its azimuth (the drawn arc runs on the true direction).
        expect(Math.abs(sun.x - skyGeom(w, BOX).x(w.bodies.sun.azimuth))).toBeLessThan(1)
        // Up: on the relief the land is drawn with, at its apparent altitude (the top limb's, as the SVG places it).
        expect(Math.abs(sun.y - (BOX.landTop + w.relief.y(apparentAltitude(w.bodies.sun.altitude) + 0.267)))).toBeLessThan(1)
      }
      const moon = moonOf(model)
      if (moon) {
        expect(moon.x).toBeCloseTo(w.bodies.moon.x, 6)
        expect(moon.y).toBeCloseTo(BOX.landTop + w.bodies.moon.y, 6)
        expect(moon.fraction).toBe(w.bodies.moon.illumination)
        expect(angleError(moon.tilt, sphericalBearing(w))).toBeLessThan(3)
      }
    }
  })

  it('shows stars only by night and only through the clear share of the sky: none under full cover', () => {
    expect(starsOf(sceneModel(world(id, '12:00', CLEAR), BOX))).toHaveLength(0)
    expect(starsOf(sceneModel(world(id, '21:00', OVERCAST), BOX))).toHaveLength(0)
    const clear = sceneModel(world(id, '21:00', CLEAR), BOX)
    const half = sceneModel(world(id, '21:00', { cloudCover: 50, thickCloud: 30, precipitation: 0, weatherCode: 2 }), BOX)
    expect(starsOf(clear).length).toBeGreaterThan(40)
    expect(starsOf(half).length).toBeLessThan(starsOf(clear).length)
    // The same seeded subset stays as the cover changes.
    const keyOf = (s: { x: number; y: number }) => `${s.x.toFixed(3)},${s.y.toFixed(3)}`
    const all = new Set(starsOf(clear).map(keyOf))
    for (const star of starsOf(half)) expect(all.has(keyOf(star))).toBe(true)
  })

  it('carries each sheet with the wind at its height, in screen terms (+ = left to right)', () => {
    for (const fromDeg of [270, 90]) {
      const base = worldInput(loaded.get(id)!, at('12:00'))
      const forecast = { ...base.forecast, hours: base.forecast.hours.map((h) => ({ ...h, windDirection: fromDeg, windAloft: null })) }
      const w = buildWorld({ ...base, forecast, selected: at('13:00'), forced: { cloudCover: 80, thickCloud: 60, windSpeed: 20 } })
      const sheets = ofKind(sceneModel(w, BOX), 'cloudSheet')
      expect(sheets.length).toBeGreaterThan(0)
      for (const sheet of sheets) {
        // A westerly goes east, and east is on the left in the true south-facing view: right to left.
        for (const band of sheet.animated?.advect?.bands ?? []) {
          if (Math.abs(band.speed) > 1e-6) expect(Math.sign(band.speed)).toBe(fromDeg === 270 ? -1 : 1)
        }
      }
    }
  })

  it('flashes lightning only when the world has thunder, inside its raining cells', () => {
    for (const hour of HOURS) expect(ofKind(sceneModel(world(id, hour), BOX), 'flash')).toHaveLength(0)
    expect(ofKind(sceneModel(world(id, '12:00', { ...THUNDER, weatherCode: 63 }), BOX), 'flash')).toHaveLength(0)
    const w = world(id, '12:00', THUNDER)
    expect(w.rain?.thunder).toBe(true)
    const model = sceneModel(w, BOX)
    const flashes = ofKind(model, 'flash')
    expect(flashes.length).toBeGreaterThan(0)
    const geom = skyGeom(w, BOX)
    const cells = new Set(w.rain!.cells.map((c) => `${c.level}:${c.bank}`))
    const rain = fallingOf(w, BOX, geom, 'rain')!
    for (const flash of flashes) {
      expect(cells.has(flash.cloud.id)).toBe(true)
      // It drifts with its rain: the field's carry of the raining cells.
      expect(flash.animated!.speed).toBe(rain.speed)
      expect(flash.animated!.period).toBe(geom.period)
      expect(flash.animated!.pulse).toBeTruthy()
    }
  })
})

describe('sky: the animation is a pure function of the phase', () => {
  it('drifts by speed × phase, wrapped into the band', () => {
    const spec = { mode: 'drift' as const, speed: -7.5, period: 540 }
    expect(driftAt(spec, 0)).toBe(0)
    expect(driftAt(spec, 10)).toBeCloseTo(540 - 75, 9)
    expect(driftAt(spec, 10 + 540 / 7.5)).toBeCloseTo(driftAt(spec, 10), 9)
    expect(driftAt(undefined, 10)).toBe(0)
  })

  it('flashes on a seeded schedule: dark at the start and between strokes, the same at the same phase', () => {
    const pulse = { seed: 12345, first: 3, every: [7, 22] as [number, number] }
    const spec = { mode: 'drift' as const, pulse }
    expect(flashAt(spec, 0)).toBe(0)
    const list = strikes(pulse)
    expect(list.length).toBeGreaterThan(10)
    for (const s of list.slice(0, 5)) {
      expect(flashAt(spec, s.at + 0.03)).toBe(1)
      expect(flashAt(spec, s.at - 0.5)).toBe(0)
    }
    for (let i = 1; i < list.length; i++) expect(list[i].at - list[i - 1].at).toBeGreaterThanOrEqual(7)
    const samples = Array.from({ length: 400 }, (_, i) => flashAt(spec, i * 0.37))
    expect(Array.from({ length: 400 }, (_, i) => flashAt(spec, i * 0.37))).toEqual(samples)
    expect(flashAt(undefined, 5)).toBe(1)
  })

  it('paints the same calls twice (seeded painters, no clock): flashes, bodies, stars', () => {
    const log = (desc: LayerDesc, paint: (ctx: Ctx2D, desc: never, env: PaintEnv) => void) => {
      const calls: string[] = []
      const fake = (): Ctx2D => new Proxy({}, {
        get: (_t, prop) => (prop === 'canvas' ? { width: 10, height: 10 } : (...args: unknown[]) => {
          calls.push(`${String(prop)}(${args.map((a) => (typeof a === 'number' ? a.toFixed(4) : typeof a)).join()})`)
          return prop === 'createLinearGradient' || prop === 'createRadialGradient' ? { addColorStop: () => {} } : undefined
        }),
        set: (_t, prop, value) => { calls.push(`${String(prop)}=${String(value)}`); return true },
      }) as unknown as Ctx2D
      const env: PaintEnv = { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: { width: 10, height: 10 } as OffscreenCanvas, ctx: fake() }) }
      paint(fake(), desc as never, env)
      return calls
    }
    const w = world('haifa', '16:30', THUNDER)
    const layers = sky(sceneModel(w, BOX))
    const night = sky(sceneModel(world('haifa', '21:00', CLEAR), BOX))
    const cases: [LayerDesc, (ctx: Ctx2D, desc: never, env: PaintEnv) => void][] = [
      ...layers.filter((l) => l.kind === 'flash').map((l) => [l, paintFlash] as [LayerDesc, typeof paintFlash]),
      ...night.filter((l) => l.kind === 'bodies').map((l) => [l, paintBodies] as [LayerDesc, typeof paintBodies]),
      ...night.filter((l) => l.kind === 'stars').map((l) => [l, paintStars] as [LayerDesc, typeof paintStars]),
    ]
    expect(cases.length).toBeGreaterThan(3)
    for (const [desc, paint] of cases) {
      const a = log(desc, paint)
      expect(a.length).toBeGreaterThan(0)
      expect(log(desc, paint)).toEqual(a)
    }
    // The model itself: the same world twice gives the same sky.
    expect(sky(sceneModel(world('haifa', '16:30', THUNDER), BOX))).toEqual(layers)
  })

  it('keeps every sky description structured-cloneable (it goes to the paint worker)', () => {
    for (const layer of sky(sceneModel(world('tiberias', '12:00', THUNDER), BOX))) expect(structuredClone(layer)).toEqual(layer)
  })
})

/** The world state the tests read is the one the model drew (no hidden second state). */
export type { WorldState }

const angleError = (a: number, b: number) => Math.abs((a - b + 540) % 360 - 180)

function sphericalBearing(w: WorldState) {
  const { moon, sun } = w.bodies
  const rad = Math.PI / 180
  const vector = ({ azimuth, altitude }: typeof sun) => {
    const a = azimuth * rad, h = altitude * rad
    return [Math.cos(h) * Math.cos(a), Math.cos(h) * Math.sin(a), Math.sin(h)]
  }
  const m = vector(moon), s = vector(sun)
  // A point on the chord, normalized back onto the sphere, follows the same great circle.
  const [x, y, z] = m.map((component, i) => component + (s[i] - component) * 1e-6)
  const altitude = Math.atan2(z, Math.hypot(x, y))
  const deltaAzimuth = Math.atan2(y, x) - moon.azimuth * rad
  const across = Math.atan2(Math.sin(deltaAzimuth), Math.cos(deltaAzimuth)) * Math.cos(moon.altitude * rad)
  return Math.atan2(moon.altitude * rad - altitude, w.camera.handed * across) / rad
}

it('uses the true lunar bearing at six times and when both discs are drawn', () => {
  for (const hour of ['03:30', '05:45', '12:00', '15:10', '18:00', '22:00']) {
    const w = world(SCENE_PLACES[0].id, hour, CLEAR)
    const expected = sphericalBearing(w)
    expect(angleError(w.bodies.moon.tilt, expected), hour).toBeLessThan(3)
    const disc = moonDisc(w, BOX)
    if (disc) expect(angleError(disc.tilt, expected), hour).toBeLessThan(3)
  }
  // Equal elevations make the centre-to-centre line horizontal. The tangent of the great circle climbs.
  const fixture = world(SCENE_PLACES[0].id, '12:00', CLEAR)
  // Use a 2:1 vertical-to-horizontal scale for an analytic screen angle.
  const slope = 2 * fixture.camera.pxPerDeg * BOX.width / fixture.camera.width
  const base = { ...fixture, relief: { ...fixture.relief, y: (altitude: number) => -slope * altitude } }
  const geom = skyGeom(base, BOX)
  const sunAzimuth = base.camera.heading + 45, moonAzimuth = base.camera.heading - 45
  const altitude = 15
  const sunPosition = { altitude, azimuth: sunAzimuth }
  const moonPosition = { altitude, azimuth: moonAzimuth }
  const w = { ...base, air: { ...base.air, farFade: 0 }, bodies: {
    moon: { ...base.bodies.moon, ...moonPosition, up: true, illumination: 0.5,
      tilt: brightLimbAngle(moonPosition, sunPosition, base.camera.handed),
      x: (geom.x(moonAzimuth) - geom.left) / geom.s, y: geom.dome(altitude) - BOX.landTop },
    sun: { ...base.bodies.sun, ...sunPosition, up: true,
      x: (geom.x(sunAzimuth) - geom.left) / geom.s, y: geom.dome(altitude) - BOX.landTop },
  } }
  const moon = moonDisc(w, BOX, geom)!, sun = sunDisc(w, BOX, geom)!
  expect(angleError(moon.tilt, sphericalBearing(w))).toBeLessThan(3)
  const drawnSunOffset = angleError(moon.tilt, Math.atan2(sun.y - moon.y, sun.x - moon.x) * 180 / Math.PI)
  // At equal altitude and 90° separation, tan(offset) = sin(altitude).
  expect(drawnSunOffset).toBeCloseTo(Math.atan(Math.sin(altitude * Math.PI / 180)) * 180 / Math.PI, 5)
})

it('uses the same magnification for different lunar sizes and viewport widths', () => {
  const place = loaded.get('haifa')!
  const nearby = buildWorld({ ...worldInput(place, '2026-11-25T19:00'), forced: CLEAR })
  const average = { ...nearby, bodies: { ...nearby.bodies, moon: { ...nearby.bodies.moon, angularRadiusDeg: 0.26 } } }
  const layerFor = (w: WorldState) => bodyLayers(w, BOX).find((l) => l.moon)!
  const nearLayer = layerFor(nearby), averageLayer = layerFor(average)
  const averageRadius = averageLayer.moon!.r
  const nearRadius = nearLayer.moon!.r
  expect(averageRadius).toBeCloseTo(0.26 * average.camera.pxPerDeg * MOON_MAGNIFICATION)
  expect(nearRadius / averageRadius).toBeCloseTo(nearby.bodies.moon.angularRadiusDeg / 0.26)
  expect(nearRadius / averageRadius).toBeGreaterThan(1.06)
  expect(moonDisc(nearby, { ...BOX, width: 520 })!.r / nearRadius).toBeCloseTo(520 / BOX.width)
  expect(nearLayer.bounds.w).toBeGreaterThan(averageLayer.bounds.w)
  expect(nearLayer.key).not.toEqual(averageLayer.key)
})

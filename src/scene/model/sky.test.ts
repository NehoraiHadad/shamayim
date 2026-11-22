import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { apparentAltitude } from '../../world/skyProjection'
import type { WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { paintBodies, paintStars } from '../paint/bodies'
import { paintClouds, paintFlash } from '../paint/clouds'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/hand'
import { layersOn, sceneModel } from '.'
import { driftAt, flashAt, strikes } from './anim'
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
        expect(moon.tilt).toBe(w.bodies.moon.tilt)
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

  it('lights each cloud from the light’s side: toward the sun on screen, from below at a low sun', () => {
    let checked = 0
    for (const hour of ['06:20', '12:00', '16:30']) {
      const w = world(id, hour, { cloudCover: 60, thickCloud: 40, precipitation: 0, weatherCode: 2 })
      if (!w.bodies.sun.up) continue
      const geom = skyGeom(w, BOX)
      const sx = geom.left + w.bodies.sun.x * geom.s, sy = BOX.landTop + w.bodies.sun.y
      for (const layer of ofKind(sceneModel(w, BOX), 'clouds')) {
        for (const bank of layer.banks.filter((b) => b.toward && b.litA > 0.02)) {
          // The bank's copy nearest the sun on the band.
          const x = bank.x + Math.round((sx - bank.x) / layer.period) * layer.period
          const [tx, ty] = bank.toward!
          const dx = sx - x, dy = sy - (bank.y - bank.h / 2)
          // The model snaps the direction to 8° steps (the key's step): within half a step of the true one.
          const off = Math.abs(((Math.atan2(ty, tx) - Math.atan2(dy, dx)) * 180 / Math.PI + 540) % 360 - 180)
          expect(off).toBeLessThanOrEqual(4.01)
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 0.2) expect(Math.sign(tx)).toBe(Math.sign(dx))
          checked++
        }
        if (w.bodies.sun.altitude < 3) expect(layer.banks.some((b) => b.under > 0.05)).toBe(true)
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('drifts each layer with the wind at its height, in screen terms (+ = left to right), faster aloft', () => {
    for (const fromDeg of [270, 90]) {
      const base = worldInput(loaded.get(id)!, at('12:00'))
      const forecast = { ...base.forecast, hours: base.forecast.hours.map((h) => ({ ...h, windDirection: fromDeg, windAloft: null })) }
      const w = buildWorld({ ...base, forecast, selected: at('13:00'), forced: { cloudCover: 80, thickCloud: 60, windSpeed: 20 } })
      const clouds = ofKind(sceneModel(w, BOX), 'clouds')
      expect(clouds.length).toBeGreaterThan(0)
      for (const layer of clouds) {
        const across = w.wind.aloftAcross[layer.level]
        // A westerly goes east, and east is on the left in the true south-facing view: right to left.
        expect(Math.sign(layer.animated!.speed!)).toBe(fromDeg === 270 ? -1 : 1)
        expect(Math.sign(layer.animated!.speed!)).toBe(Math.sign(across))
        expect(layer.animated!.speed!).toBeCloseTo(w.clouds.find((l) => l.level === layer.level)!.drift * BOX.width / 375, 6)
        expect(layer.animated!.period).toBe(layer.period)
        // The band carries every bank round the whole horizon.
        expect(layer.period).toBeCloseTo(360 * w.camera.pxPerDeg, 0)
      }
      const speeds = Object.fromEntries(clouds.map((l) => [l.level, Math.abs(l.animated!.speed!)]))
      if (speeds.low && speeds.high) expect(speeds.high).toBeGreaterThan(speeds.low)
    }
  })

  it('flashes lightning only when the world has thunder, inside its raining banks', () => {
    for (const hour of HOURS) expect(ofKind(sceneModel(world(id, hour), BOX), 'flash')).toHaveLength(0)
    expect(ofKind(sceneModel(world(id, '12:00', { ...THUNDER, weatherCode: 63 }), BOX), 'flash')).toHaveLength(0)
    const w = world(id, '12:00', THUNDER)
    expect(w.rain?.thunder).toBe(true)
    const model = sceneModel(w, BOX)
    const flashes = ofKind(model, 'flash')
    expect(flashes.length).toBeGreaterThan(0)
    const layer = w.clouds.find((c) => c.rains)!
    // Under a full sheet no clouds layer is left at that level: the flash then drifts by the layer's own drift.
    const drawn = ofKind(model, 'clouds').find((l) => l.level === layer.level)
    const geom = skyGeom(w, BOX)
    const cells = new Set(w.rain!.cells.map((c) => `${layer.level}:${c.bank}`))
    for (const flash of flashes) {
      expect(cells.has(flash.bank.id)).toBe(true)
      // It drifts with its layer.
      expect(flash.animated!.speed).toBe(drawn?.animated?.speed ?? layer.drift * geom.s)
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

  it('paints the same calls twice (seeded painters, no clock): clouds, flashes, bodies, stars', () => {
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
      ...layers.filter((l) => l.kind === 'clouds').map((l) => [l, paintClouds] as [LayerDesc, typeof paintClouds]),
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

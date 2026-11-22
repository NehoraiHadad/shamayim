import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import type { WorldInput } from '../../world/types'
import { buildWorld } from '../../world/world'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/hand'
import { paintOutside } from '../paint/outside'
import { paintWater } from '../paint/water'
import { paintEdge, paintFall, paintGrains, paintMist, paintRays, paintShafts, paintSheen, paintSmoke } from '../paint/weather'
import { sceneModel } from '.'
import { fallAt, frameAt, framePhase } from './anim'
import { skyGeom } from './sky'
import type { LayerDesc, LayerKind, LayerOf, SceneBox, SceneModel } from './types'
import { inView, mistiness, NEAR_ALT } from './weather'

/**
 * Stage C7 (docs/design/CANVAS-SCENE-PLAN.md §4): the weather, structurally, over the 8 baseline places. One world state:
 * rain and snow only from the banks that rain or snow, at their true sides, slanted and carried by the one wind; smoke
 * downwind; mist only in a damp or foggy air; rays only from a low sun behind broken cloud; the edge mark only when the
 * rain is out of view, on its true side; every animation a pure function of the phase.
 */
const DAY = '2026-11-17'
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

const at = (hour: string) => `${DAY}T${hour}` as LocalTime
const world = (id: string, hour: string, forced: WorldInput['forced'] = null) => buildWorld({ ...worldInput(loaded.get(id)!, at(hour)), forced })
const ofKind = <K extends LayerKind>(model: SceneModel, kind: K) => model.layers.filter((l): l is LayerOf<K> => l.kind === kind)
const FALLING: LayerKind[] = ['shafts', 'fall', 'edge']

const RAIN = (windDirection: number) => ({ precipitation: 4, weatherCode: 63, cloudCover: 95, thickCloud: 90, windSpeed: 35, windGusts: 55,
  windDirection, humidity: 95 })
const SHOWERS = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45, windDirection: 250, humidity: 80 }
const SNOW = { snowfall: 2, precipitation: 2, temperature: -1, feelsLike: -4, cloudCover: 100, thickCloud: 100, weatherCode: 73, windSpeed: 20,
  windDirection: 300 }
const CLEAR = { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0, humidity: 40, visibilityKm: 30 }
const OVERCAST = { cloudCover: 100, thickCloud: 100, precipitation: 0, weatherCode: 3, humidity: 60, visibilityKm: 25 }
const BROKEN = { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2, humidity: 60, visibilityKm: 25 }
const FOG = { humidity: 99, visibilityKm: 1.5, cloudCover: 60, thickCloud: 30, precipitation: 0, weatherCode: 45, windSpeed: 6 }
const DUST = { pm10: 400, dust: 400, visibilityKm: 3, humidity: 30 }
const HOURS = ['06:20', '09:00', '12:00', '14:00', '16:30']

describe.each(SCENE_PLACES)('weather: $id', ({ id }) => {
  it('rains and snows only from the banks the world makes rain or snow', { timeout: 30000 }, () => {
    for (const hour of HOURS) {
      for (const forced of [CLEAR, OVERCAST, BROKEN, FOG]) {
        const w = world(id, hour, forced)
        expect(w.rain).toBeNull()
        expect(w.snowfall).toBeNull()
        const model = sceneModel(w, BOX)
        expect(model.layers.filter((l) => FALLING.includes(l.kind)).map((l) => l.id), `${hour}`).toEqual([])
      }
      for (const forced of [RAIN(270), SHOWERS, SNOW]) {
        const w = world(id, hour, forced)
        const cells = w.rain?.cells ?? w.snowfall?.cells ?? []
        expect(cells.length).toBeGreaterThan(0)
        const layer = w.clouds.find((l) => l.rains)!
        const falling = new Set(cells.map((c) => `${layer.level}:${c.bank}`))
        const model = sceneModel(w, BOX)
        for (const shafts of ofKind(model, 'shafts')) {
          for (const s of shafts.shafts) {
            expect(falling.has(s.id)).toBe(true)
            // A far curtain hangs under a bank low on the dome, from its base to the horizon.
            const bank = layer.banks.find((b) => `${layer.level}:${b.id}` === s.id)!
            expect(bank.altitude).toBeLessThan(NEAR_ALT)
            expect(s.bottom).toBeGreaterThan(s.top)
          }
        }
        // Rain falls under its banks: every fall area lies under one of them (its top at or below the bank's base).
        const clouds = ofKind(model, 'clouds').find((l) => l.level === layer.level)!
        const banks = clouds.banks.filter((b) => falling.has(b.id))
        for (const fall of ofKind(model, 'fall')) {
          const dy = fall.surface === 'land' ? BOX.landTop : 0
          for (const area of fall.animated!.fall!.areas) {
            const top = Math.min(...area.map(([, y]) => y)) + dy
            expect(banks.some((b) => top >= b.y - b.h * 0.25)).toBe(true)
          }
        }
      }
    }
  })

  it('slants the rain and carries the snow with the one wind', { timeout: 30000 }, () => {
    for (const dir of [270, 90, 200]) {
      for (const forced of [RAIN(dir), { ...SNOW, windDirection: dir }]) {
        const w = world(id, '12:00', forced)
        const sign = Math.sign(w.wind.across)
        const slant = (w.rain ?? w.snowfall)!.slant
        if (Math.abs(w.wind.across) > 0.05) expect(Math.sign(slant)).toBe(sign)
        const model = sceneModel(w, BOX)
        for (const fall of ofKind(model, 'fall')) {
          const f = fall.animated!.fall!
          expect(f.vy).toBeGreaterThan(0)
          if (Math.abs(slant) > 0.01) expect(Math.sign(f.vx)).toBe(sign)
          expect(Math.sign(fall.slant)).toBe(Math.sign(slant) || 0)
        }
        for (const s of ofKind(model, 'shafts').flatMap((l) => l.shafts)) if (Math.abs(slant) > 0.01) expect(Math.sign(s.lean)).toBe(sign)
        for (const e of ofKind(model, 'edge')) if (Math.abs(slant) > 0.01) expect(Math.sign(e.lean)).toBe(sign)
        // The curtains and the rain in them drift with the cloud layer that makes them.
        const layer = w.clouds.find((l) => l.rains)!
        const drift = ofKind(model, 'clouds').find((l) => l.level === layer.level)?.animated?.speed ?? 0
        for (const l of [...ofKind(model, 'shafts'), ...ofKind(model, 'fall')]) expect(l.animated?.speed ?? 0).toBeCloseTo(drift, 9)
      }
    }
  })

  it('puts the edge mark only when the rain is out of view, on the side it truly lies', { timeout: 30000 }, () => {
    for (const hour of HOURS) {
      for (const forced of [SHOWERS, RAIN(270), SNOW]) {
        const w = world(id, hour, forced)
        const model = sceneModel(w, BOX)
        const geom = skyGeom(w, BOX)
        const layer = w.clouds.find((l) => l.rains)!
        const cells = new Set(((w.rain ?? w.snowfall)?.cells ?? []).map((c) => `${layer.level}:${c.bank}`))
        const banks = ofKind(model, 'clouds').find((l) => l.level === layer.level)!.banks.filter((b) => cells.has(b.id))
        const seen = banks.some((b) => inView(geom, BOX, b))
        const edges = ofKind(model, 'edge')
        expect(edges.length).toBe(seen ? 0 : 1)
        if (seen) continue
        expect(ofKind(model, 'fall')).toEqual([])
        // The side of the nearest falling bank, the short way round the horizon from the middle of the view.
        const mid = geom.left + BOX.width / 2
        const offsets = banks.map((b) => b.x + Math.round((mid - b.x) / geom.period) * geom.period - mid)
        const nearest = offsets.sort((a, b) => Math.abs(a) - Math.abs(b))[0]
        expect(edges[0].side).toBe(nearest < 0 ? 'left' : 'right')
        expect(edges[0].x).toBe(nearest < 0 ? geom.left : geom.left + BOX.width)
      }
    }
  })

  it('lays mist only in a damp or foggy air, low ground first', () => {
    for (const hour of ['06:20', '12:00']) {
      for (const forced of [CLEAR, DUST, BROKEN]) {
        const w = world(id, hour, forced)
        expect(mistiness(w)).toBeLessThan(0.08)
        expect(ofKind(sceneModel(w, BOX), 'mist')).toEqual([])
      }
      const fog = world(id, hour, FOG)
      const mist = ofKind(sceneModel(fog, BOX), 'mist')
      expect(mist.map((l) => l.id)).toEqual(['mist.valley', 'mist.ground'])
      // The valley's mist lies behind the near ridge (under it in the stack), the ground fog over it; level, drifting.
      expect(mist[0].z).toBeLessThan(30)
      expect(mist[1].z).toBeGreaterThan(30)
      for (const l of mist) {
        expect(l.animated?.mode).toBe('drift')
        if (Math.abs(fog.wind.across) > 0.05) expect(Math.sign(l.animated!.speed!)).toBe(Math.sign(fog.wind.across))
      }
      // Damp but clear: valley mist at dawn, burned off by noon.
      const damp = world(id, hour, { ...BROKEN, humidity: 96, visibilityKm: 12 })
      expect(ofKind(sceneModel(damp, BOX), 'mist').map((l) => l.id)).toEqual(hour === '06:20' ? ['mist.valley'] : [])
    }
  })

  it('casts rays only where they really occur, from the sun\'s true spot (C7, C9)', () => {
    const rays = (hour: string, forced: WorldInput['forced']) => ofKind(sceneModel(world(id, hour, forced), BOX), 'rays')
    // None by night, none from a coin of a sun in dust, none through a closed sky.
    expect(rays('21:00', BROKEN)).toEqual([])
    for (const hour of ['06:20', '12:00', '16:30']) {
      expect(rays(hour, DUST)).toEqual([])
      expect(rays(hour, OVERCAST).filter((l) => l.id !== 'rays.ridge')).toEqual([])
    }
    // Clear, dry air at a high sun: nothing scatters enough.
    expect(rays('12:00', { ...CLEAR, visibilityKm: 40 })).toEqual([])
    for (const hour of ['06:20', '09:00', '12:00', '16:30']) {
      const w = world(id, hour, BROKEN)
      const geom = skyGeom(w, BOX)
      const sunX = geom.left + w.bodies.sun.x * geom.s, sunY = BOX.landTop + w.bodies.sun.y
      for (const layer of rays(hour, BROKEN)) {
        // The gaps' beams, the ridge's and the glare fan from the sun's true spot; the anticrepuscular converge opposite it.
        if (layer.id === 'rays.anti') expect(layer.x).toBeCloseTo(geom.x(w.bodies.sun.azimuth + 180), 6)
        else expect([layer.x, layer.y]).toEqual([sunX, sunY])
      }
    }
    // Behind broken cloud in a hazy air the gaps cast rays at any height of the sun, stronger when it is low.
    const hazy = { ...BROKEN, visibilityKm: 10 }
    const noon = rays('12:00', hazy).find((l) => l.id === 'rays')
    expect(noon).toBeTruthy()
  })
})

describe('weather: smoke and the wind', () => {
  it('carries smoke and steam downwind, rising straighter in a calm', () => {
    let plumes = 0
    for (const dir of [270, 90]) {
      for (const speed of [8, 40]) {
        const w = world('haifa', '12:00', { ...CLEAR, windDirection: dir, windSpeed: speed })
        const smoke = ofKind(sceneModel(w, BOX), 'smoke')
        expect(smoke.length).toBeGreaterThan(0)
        for (const l of smoke) {
          expect(l.animated?.frames).toBeTruthy()
          for (const p of l.plumes) {
            plumes++
            expect(p.dy).toBeLessThan(0)
            if (Math.abs(w.wind.across) > 0.05) expect(Math.sign(p.dx)).toBe(Math.sign(w.wind.across))
          }
        }
      }
      const calm = ofKind(sceneModel(world('haifa', '12:00', { ...CLEAR, windDirection: dir, windSpeed: 5 }), BOX), 'smoke')[0].plumes[0]
      const gale = ofKind(sceneModel(world('haifa', '12:00', { ...CLEAR, windDirection: dir, windSpeed: 45 }), BOX), 'smoke')[0].plumes[0]
      expect(Math.abs(gale.dx) / Math.abs(gale.dy)).toBeGreaterThan(Math.abs(calm.dx) / Math.abs(calm.dy))
    }
    expect(plumes).toBeGreaterThan(0)
  })

  it('sways the trees only in a wind, and ripples the water with it', () => {
    // The place's own trees (the one builder's, C5): still in a calm, a strip of frames in a wind.
    const place = (speed: number) => ofKind(sceneModel(world('rosh-pina', '12:00', { ...CLEAR, windSpeed: speed }), BOX), 'outside')[0]
    expect(place(4).items.some((item) => item.kind === 'tree')).toBe(true)
    expect(place(4).sea).toBeNull()
    expect(place(4).animated).toBeUndefined()
    expect(place(30).animated?.frames).toBeTruthy()
    expect(place(30).shine.sway).toBeGreaterThan(0)
    // A coastal sea (C5) ripples with the wind too.
    for (const dir of [270, 90]) {
      const w = world('tel-aviv', '12:00', { ...CLEAR, windDirection: dir, windSpeed: 25 })
      const sea = ofKind(sceneModel(w, BOX), 'outside')[0]
      expect(sea.sea?.ripples.length).toBeGreaterThan(0)
      expect(sea.animated?.frames).toBeTruthy()
      if (Math.abs(w.wind.across) > 0.05) expect(Math.sign(sea.sea!.drift!)).toBe(Math.sign(w.wind.across))
    }
    for (const dir of [270, 90]) {
      const w = world('tiberias', '07:30', { ...CLEAR, windDirection: dir, windSpeed: 25 })
      for (const water of ofKind(sceneModel(w, BOX), 'water')) {
        if (!water.ruffle.lit.length) continue
        expect(water.animated?.frames).toBeTruthy()
        expect(Math.sign(water.ruffle.drift)).toBe(Math.sign(w.wind.across))
      }
    }
  })

  it('sheens the ground only when it is wet', () => {
    expect(ofKind(sceneModel(world('jerusalem', '12:00', CLEAR), BOX), 'sheen')).toEqual([])
    const wet = world('jerusalem', '12:00', RAIN(270))
    expect(wet.ground.wet).toBeGreaterThan(0.5)
    expect(ofKind(sceneModel(wet, BOX), 'sheen').length).toBe(1)
  })
})

describe('weather: animation, pure in the phase', () => {
  /** A painter's calls, for a desc at a phase. */
  const log = (desc: LayerDesc, paint: (ctx: Ctx2D, desc: never, env: PaintEnv) => void, phase = 0) => {
    const calls: string[] = []
    const fake = (): Ctx2D => new Proxy({}, {
      get: (_t, prop) => (prop === 'canvas' ? { width: 10, height: 10 } : (...args: unknown[]) => {
        calls.push(`${String(prop)}(${args.map((a) => (typeof a === 'number' ? a.toFixed(4) : typeof a)).join()})`)
        if (prop === 'createImageData') return { data: new Uint8ClampedArray((args[0] as number) * (args[1] as number) * 4) }
        return prop === 'createLinearGradient' || prop === 'createRadialGradient' ? { addColorStop: () => {} } : undefined
      }),
      set: (_t, prop, value) => { calls.push(`${String(prop)}=${String(value)}`); return true },
    }) as unknown as Ctx2D
    const env: PaintEnv = { hand: HAND, phase, scale: 2, canvas: () => ({ canvas: { width: 10, height: 10 } as OffscreenCanvas, ctx: fake() }) }
    paint(fake(), desc as never, env)
    return calls
  }

  it('lays a frame, a fall and a drift from the phase alone', () => {
    const frames = { mode: 'frames' as const, frames: { count: 6, fps: 6 } }
    const phases = Array.from({ length: 200 }, (_, i) => i * 0.137)
    expect(phases.map((p) => frameAt(frames, p))).toEqual(phases.map((p) => frameAt(frames, p)))
    expect(phases.map((p) => frameAt(frames, p)).every((f) => f >= 0 && f < 6)).toBe(true)
    // The strip loops: a loop later is the same frame.
    for (const p of phases) expect(frameAt(frames, p + 1)).toBe(frameAt(frames, p))
    expect(framePhase(frames, 3)).toBeCloseTo(0.5, 9)
    const fall = { mode: 'fall' as const, fall: { vx: -40, vy: 300, areas: [], sway: 2, swayPeriod: 4 } }
    const tile = { w: 64, h: 96 }
    for (const p of phases) {
      const a = fallAt(fall, p, tile)
      expect(a).toEqual(fallAt(fall, p, tile))
      expect(a.x).toBeGreaterThanOrEqual(0); expect(a.x).toBeLessThan(64)
      expect(a.y).toBeGreaterThanOrEqual(0); expect(a.y).toBeLessThan(96)
    }
    // Falling: later is further down (modulo the tile).
    expect(fallAt(fall, 0.1, tile).y).toBeCloseTo(30, 9)
  })

  it('paints the same calls twice and the same frame a loop later', () => {
    const cases: [LayerDesc, (ctx: Ctx2D, desc: never, env: PaintEnv) => void][] = []
    const add = (model: SceneModel) => {
      const painters: Partial<Record<LayerKind, (ctx: Ctx2D, desc: never, env: PaintEnv) => void>> = {
        shafts: paintShafts, fall: paintFall, mist: paintMist, grains: paintGrains, rays: paintRays, smoke: paintSmoke, sheen: paintSheen,
        edge: paintEdge, water: paintWater, outside: paintOutside }
      for (const l of model.layers) if (painters[l.kind] && (l.animated || !['water', 'outside'].includes(l.kind))) cases.push([l, painters[l.kind]!])
    }
    add(sceneModel(world('haifa', '12:00', RAIN(270)), BOX))
    add(sceneModel(world('haifa', '16:30', BROKEN), BOX))
    add(sceneModel(world('tiberias', '07:30', { ...FOG, windSpeed: 25 }), BOX))
    add(sceneModel(world('jerusalem', '12:00', DUST), BOX))
    add(sceneModel(world('jerusalem', '12:00', SHOWERS), BOX))
    add(sceneModel(world('rosh-pina', '12:00', { ...CLEAR, windSpeed: 50 }), BOX))
    const kinds = new Set(cases.map(([l]) => l.kind))
    for (const kind of ['shafts', 'fall', 'mist', 'grains', 'rays', 'smoke', 'sheen', 'edge', 'water', 'outside']) expect(kinds.has(kind as LayerKind), kind).toBe(true)
    for (const [desc, paint] of cases) {
      // (The place's layer keeps its grain tile between paints: warm it first.)
      log(desc, paint, 0.4)
      const a = log(desc, paint, 0.4)
      expect(a.length).toBeGreaterThan(0)
      expect(log(desc, paint, 0.4)).toEqual(a)
      const frames = desc.animated?.frames
      if (frames) {
        const loop = frames.count / frames.fps
        expect(log(desc, paint, 0.4 + loop), desc.id).toEqual(a)
        // And it moves: another frame of the loop is another picture.
        expect(log(desc, paint, 0.4 + loop / 2), desc.id).not.toEqual(a)
      }
    }
  })

  it('keeps every weather description structured-cloneable (it goes to the paint worker)', () => {
    for (const forced of [RAIN(270), SHOWERS, FOG, DUST, SNOW]) {
      for (const layer of sceneModel(world('haifa', '16:30', forced), BOX).layers) expect(structuredClone(layer)).toEqual(layer)
    }
  })
})

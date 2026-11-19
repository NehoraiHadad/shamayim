import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { GENERIC_TERRAIN } from '../../data/terrain/terrain'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { UNKNOWN_EYE_Y } from '../../world/terrain'
import type { WorldInput, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import type { LayerCanvas } from '../compose/layerCache'
import { makeLoop } from '../compose/loop'
import { Surface } from '../compose/surface'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/hand'
import { paintLoading } from '../paint/loading'
import { sceneModel } from '.'
import { driftAt, fadeAt, glideAt, revealAt, settleEnd } from './anim'
import { ARRIVAL_END, GUESS, guessLine } from './loading'
import type { LandClock, LayerDesc, LayerOf, SceneBox, SceneModel } from './types'

/**
 * Stage C8 (docs/design/CANVAS-SCENE-PLAN.md §4): loading as an animation. While the land is not known the sky and the
 * weather show, the land's place holds a mist with a ridge line forming (offline: the mist alone), no land layer is drawn
 * and no label shows; when the land arrives its layers come up under the thinning mist, the true crest drawn from the
 * place outward, the sky settling to the land's eye level: every motion monotonic and a pure function of the phase.
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
const input = (id: string, hour: string, forced: WorldInput['forced'] = null) => ({ ...worldInput(loaded.get(id)!, at(hour)), forced })
/** The world while the land is not known: App hands the drawn stand-in with its status; the world must not use its shape. */
const unknown = (id: string, hour: string, status: 'loading' | 'offline', forced: WorldInput['forced'] = null): WorldState =>
  buildWorld({ ...input(id, hour, forced), terrain: { ...GENERIC_TERRAIN, status } })
const known = (id: string, hour: string, forced: WorldInput['forced'] = null) => buildWorld(input(id, hour, forced))
const land = (model: SceneModel) => model.layers.filter((l) => l.surface === 'land')
const RAIN = { precipitation: 4, weatherCode: 63, cloudCover: 95, thickCloud: 90, windSpeed: 35, windGusts: 55, windDirection: 270, humidity: 95 }
const DUST = { pm10: 400, dust: 400, visibilityKm: 3, humidity: 30 }
const ON_LAND = new Set(['plane', 'water', 'farCities', 'marks', 'portrait', 'outside', 'mist', 'smoke', 'sheen'])
const PHASES = Array.from({ length: 121 }, (_, i) => i * 0.025)
/** The land arriving: its reveal begun at phase 0 (null: held, its layers still painting), after 3 s of mist. */
const arriving = (t: number | null): LandClock => ({ loadingAt: -3, reveal: { at: t === null ? null : -t, fromHorizonY: UNKNOWN_EYE_Y, guessed: true } })
const byId = (model: SceneModel, id: string) => model.layers.find((l) => l.id === id)

describe.each(SCENE_PLACES)('loading: $id', ({ id }) => {
  it('stands on no land while it loads: no ridge, a guessed eye level, nothing placed, the stand-in unused', () => {
    for (const status of ['loading', 'offline'] as const) {
      const w = unknown(id, '12:00', status)
      expect(w.terrain.status).toBe(status)
      expect(w.relief.horizonY).toBe(UNKNOWN_EYE_Y)
      expect(w.terrain.near.points.every(([, y]) => y === UNKNOWN_EYE_Y)).toBe(true)
      expect(w.marks).toEqual([])
      expect(w.water.spans).toEqual([])
      expect(w.farCities.patches).toEqual([])
      expect(w.labels.notes).toEqual([])
      expect(w.place3.kind === 'portrait' && w.place3.plan.houses.length + w.place3.plan.trees.length).toBe(0)
    }
    expect(known(id, '12:00').terrain.status).toBe('ready')
  })

  it('draws no land layer before the data, and the mist in its place (with the line while loading, alone offline)', () => {
    for (const hour of ['06:20', '12:00', '16:30', '21:00']) {
      for (const forced of [null, RAIN, DUST]) {
        for (const status of ['loading', 'offline'] as const) {
          const model = sceneModel(unknown(id, hour, status, forced), BOX, { loadingAt: 0 })
          const onLand = land(model)
          expect(onLand.filter((l) => ON_LAND.has(l.kind)).map((l) => l.id), `${hour} ${status}`).toEqual([])
          expect(onLand.every((l) => l.kind === 'loading' || l.id === 'fall.land' || l.id === 'grains.land')).toBe(true)
          expect(onLand.filter((l) => l.kind === 'loading').map((l) => l.id)).toEqual(status === 'loading'
            ? ['loading.mist', 'loading.guess'] : ['loading.mist'])
          // The sky and the weather that needs no land show as they do with it.
          expect(model.layers.some((l) => l.kind === 'sky')).toBe(true)
        }
      }
    }
    // The near rain over the land falls in front of the mist.
    const rain = sceneModel(unknown(id, '12:00', 'loading', RAIN), BOX)
    const fall = byId(rain, 'fall.land')
    if (fall) expect(fall.z).toBeGreaterThan(byId(rain, 'loading.mist')!.z)
  })

  it('keeps every label back until the land is in', () => {
    for (const status of ['loading', 'offline'] as const) {
      const model = sceneModel(unknown(id, '16:30', status), BOX, { loadingAt: -2 })
      expect(model.overlay).toEqual([])
      expect(model.clear).toEqual([])
    }
    expect(sceneModel(known(id, '16:30'), BOX).overlay.length).toBeGreaterThan(0)
  })

  it('brings the land in monotonically: up under the thinning mist, the crest drawn outward, the sky settling', () => {
    const w = known(id, '16:30')
    const model = sceneModel(w, BOX, arriving(0))
    const plain = sceneModel(w, BOX)
    // The same layers as the land shown as it is, plus the mist, the guess and the crest; the same keys (nothing repainted).
    expect(model.layers.filter((l) => l.kind !== 'loading').map((l) => [l.id, l.key])).toEqual(plain.layers.map((l) => [l.id, l.key]))
    const loadingModel = sceneModel(unknown(id, '16:30', 'loading'), BOX, { loadingAt: -3 })
    for (const lid of ['loading.mist', 'loading.guess']) expect(byId(model, lid)!.key).toBe(byId(loadingModel, lid)!.key)
    const series = (_layer: LayerDesc, f: (p: number) => number) => PHASES.map(f)
    const nondecreasing = (v: number[]) => v.every((x, i) => i === 0 || x >= v[i - 1] - 1e-12)
    const nonincreasing = (v: number[]) => v.every((x, i) => i === 0 || x <= v[i - 1] + 1e-12)
    for (const layer of land(model)) {
      if (layer.kind === 'loading' || layer.id === 'fall.land' || layer.id === 'grains.land') continue
      const alpha = series(layer, (p) => fadeAt(layer.animated, p, false) / fadeAt({ ...layer.animated!, fade: undefined }, p, false))
      expect(alpha[0], layer.id).toBe(0)
      expect(nondecreasing(alpha), layer.id).toBe(true)
      expect(alpha.at(-1), layer.id).toBe(1)
    }
    const mist = byId(model, 'loading.mist')!, guess = byId(model, 'loading.guess')!, crest = byId(model, 'loading.crest')!
    const mistA = series(mist, (p) => fadeAt(mist.animated, p))
    expect(mistA[0]).toBe(1)
    expect(nonincreasing(mistA)).toBe(true)
    expect(fadeAt(mist.animated, ARRIVAL_END)).toBe(0)
    expect(fadeAt({ ...guess.animated!, breath: undefined }, ARRIVAL_END)).toBe(0)
    expect(fadeAt(crest.animated, ARRIVAL_END)).toBe(0)
    // The crest is drawn from the place outward and the guess unmade over the same front.
    const reach = series(crest, (p) => revealAt(crest.animated, p, BOX.width))
    expect(reach[0]).toBe(0)
    expect(nondecreasing(reach)).toBe(true)
    expect(series(guess, (p) => revealAt(guess.animated, p, BOX.width))).toEqual(reach)
    expect(guess.animated!.reveal!.erase).toBe(true)
    expect(crest.animated!.reveal!.x).toBe(BOX.width / 2)
    // The sky glides from the guessed eye level to the land's, never overshooting, still at the end.
    const dy = UNKNOWN_EYE_Y - w.relief.horizonY
    for (const layer of model.layers.filter((l) => l.surface === 'sky')) {
      if (Math.abs(dy) < 0.5) { expect(layer.animated?.glide).toBeUndefined(); continue }
      const g = series(layer, (p) => glideAt(layer.animated, p))
      expect(g[0]).toBeCloseTo(dy, 9)
      expect(nonincreasing(g.map(Math.abs))).toBe(true)
      expect(g.at(-1)).toBeCloseTo(0, 12)
    }
    // The arrival ends when the shell drops it.
    expect(settleEnd(model.layers.map((l) => l.animated))).toBeLessThanOrEqual(ARRIVAL_END + 1e-9)
  })
})

describe('loading: the arrival held and timed', () => {
  it('holds the land at its start while its layers are still being painted', () => {
    const model = sceneModel(known('haifa', '12:00'), BOX, arriving(null))
    for (const layer of land(model)) {
      if (layer.kind === 'loading' || !layer.animated?.fade) continue
      for (const p of [0, 5, 60, 600]) expect(fadeAt(layer.animated, p)).toBe(0)
    }
    expect(fadeAt(byId(model, 'loading.mist')!.animated, 600)).toBe(1)
  })

  it('times every motion on the one scene clock: a model rebuilt mid-way lays the same frame at the same phase', () => {
    const w = known('jerusalem', '16:30')
    // A reveal begun at phase 5 is the one begun at 0, five seconds on; a rebuilt model (the same clock) is the same model.
    const a = sceneModel(w, BOX, arriving(0)), b = sceneModel(w, BOX, { ...arriving(0), loadingAt: 2, reveal: { at: 5, fromHorizonY: UNKNOWN_EYE_Y, guessed: true } })
    expect(sceneModel(w, BOX, arriving(0))).toEqual(a)
    for (const id of ['plane.near', 'loading.mist', 'loading.crest']) {
      const la = byId(a, id)!, lb = byId(b, id)!
      for (const p of [0, 0.2, 0.7, 1.2]) {
        expect(fadeAt(lb.animated, p + 5)).toBeCloseTo(fadeAt(la.animated, p), 9)
        expect(revealAt(lb.animated, p + 5, BOX.width)).toBeCloseTo(revealAt(la.animated, p, BOX.width), 6)
      }
    }
    // Loading too: the line forms from when the mist began, whatever model lays it.
    const w0 = unknown('jerusalem', '12:00', 'loading')
    const l0 = sceneModel(w0, BOX, { loadingAt: 0 }), l2 = sceneModel(w0, BOX, { loadingAt: 2 })
    const g0 = byId(l0, 'loading.guess')!, g2 = byId(l2, 'loading.guess')!
    expect(g2.key).toBe(g0.key)
    for (const p of [0, 0.4, 1.3, 2.5]) expect(revealAt(g2.animated, p + 2, BOX.width)).toBeCloseTo(revealAt(g0.animated, p, BOX.width), 6)
  })

  it('forms the guess from the place outward after the mist shows, and does without it offline', () => {
    const model = sceneModel(unknown('tiberias', '07:30', 'loading'), BOX, { loadingAt: 0 })
    const guess = byId(model, 'loading.guess')!
    expect(revealAt(guess.animated, 0, BOX.width)).toBe(0)
    expect(revealAt(guess.animated, GUESS.delay + GUESS.grow / 2, BOX.width)).toBeGreaterThan(0)
    expect(revealAt(guess.animated, GUESS.delay + GUESS.grow, BOX.width)).toBe(Infinity)
    // A generic line round the guessed eye level, seeded by the place, never the drawn stand-in's shape.
    const line = guessLine('tiberias')
    expect(line.every(([, y]) => Math.abs(y - UNKNOWN_EYE_Y) < 30)).toBe(true)
    expect(guessLine('tiberias')).toEqual(line)
    expect(guessLine('haifa')).not.toEqual(line)
    // An offline place that comes back online is revealed without a guess to unmake.
    const back = sceneModel(known('tiberias', '07:30'), BOX, { loadingAt: -9, reveal: { at: 0, fromHorizonY: UNKNOWN_EYE_Y, guessed: false } })
    expect(byId(back, 'loading.guess')).toBeUndefined()
    expect(byId(back, 'loading.crest')).toBeDefined()
  })

  it('under reduced motion: a still mist and line, then a simple fade (no glide, no line drawn)', () => {
    const model = sceneModel(known('haifa', '16:30'), BOX, arriving(0))
    const guess = byId(model, 'loading.guess')!, crest = byId(model, 'loading.crest')!, mist = byId(model, 'loading.mist')!
    expect(revealAt(guess.animated, 0.5, BOX.width, true)).toBe(Infinity)
    expect(revealAt(crest.animated, 0.5, BOX.width, true)).toBe(-1)
    for (const layer of model.layers.filter((l) => l.animated?.glide)) expect(glideAt(layer.animated, 0.5, true)).toBe(0)
    // The fades still run; the breath stands.
    expect(fadeAt(mist.animated, 1, true)).toBe(fadeAt(mist.animated, 1))
    const breathing = { mode: 'settle' as const, breath: { depth: 0.4, period: 6 } }
    expect(fadeAt(breathing, 3, true)).toBe(1)
    expect(fadeAt(breathing, 3)).toBeCloseTo(0.6, 9)
    // The loop runs to the end of the fade, still, then stops.
    const queue: ((t: number) => void)[] = []
    const ticks: [number, boolean][] = []
    const loop = makeLoop((p, still) => ticks.push([p, still]), { frame: (cb) => queue.push(cb), cancelFrame: () => {}, visible: () => true,
      still: () => true }, 30, 1)
    loop.start()
    for (let t = 0; queue.length && t < 5000; t += 1000 / 60) queue.shift()!(t)
    expect(ticks.every(([, still]) => still)).toBe(true)
    expect(ticks.at(-1)![0]).toBe(1)
    expect(loop.running).toBe(false)
  })

  it('is pure in the phase: the same model twice, the same painter calls twice', () => {
    const w = unknown('rosh-pina', '16:30', 'loading')
    expect(sceneModel(w, BOX, { loadingAt: -1 })).toEqual(sceneModel(w, BOX, { loadingAt: -1 }))
    expect(structuredClone(sceneModel(w, BOX, { loadingAt: -1 }).layers.filter((l) => l.kind === 'loading')))
      .toEqual(sceneModel(w, BOX, { loadingAt: -1 }).layers.filter((l) => l.kind === 'loading'))
    const log = (desc: LayerDesc) => {
      const calls: string[] = []
      const fake = (): Ctx2D => new Proxy({}, {
        get: (_t, prop) => (...args: unknown[]) => {
          calls.push(`${String(prop)}(${args.map((a) => (typeof a === 'number' ? a.toFixed(4) : typeof a)).join()})`)
          return prop === 'createLinearGradient' || prop === 'createRadialGradient' ? { addColorStop: () => {} } : undefined
        },
        set: (_t, prop, value) => { calls.push(`${String(prop)}=${String(value)}`); return true },
      }) as unknown as Ctx2D
      const env: PaintEnv = { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: { width: 10, height: 10 } as OffscreenCanvas, ctx: fake() }) }
      paintLoading(fake(), desc as LayerOf<'loading'>, env)
      return calls
    }
    const arrive = sceneModel(known('rosh-pina', '16:30'), BOX, arriving(0.3))
    for (const layer of [...sceneModel(w, BOX).layers, ...arrive.layers].filter((l) => l.kind === 'loading')) {
      const a = log(layer)
      expect(a.length, layer.id).toBeGreaterThan(5)
      expect(log(layer)).toEqual(a)
    }
    // Composite-time functions of the phase alone.
    const mist = byId(sceneModel(w, BOX), 'loading.mist')!
    for (const p of PHASES) {
      expect(driftAt(mist.animated, p)).toBe(driftAt(mist.animated, p))
      expect(fadeAt(byId(arrive, 'plane.near')!.animated, p)).toBe(fadeAt(byId(arrive, 'plane.near')!.animated, p))
    }
  })
})

describe('loading: laid at composite time', () => {
  /** A canvas whose context logs each call with its arguments. */
  function argsCanvas(width: number, height: number) {
    const calls: unknown[][] = []
    const ctx = new Proxy({}, {
      get: (_t, prop) => (...args: unknown[]) => { calls.push([prop, ...args]) },
      set: (_t, prop, value) => { calls.push([`${String(prop)}=`, value]); return true },
    })
    return { width, height, calls, getContext: () => ctx } as unknown as LayerCanvas & { calls: unknown[][] }
  }
  const ridge = (animated: LayerDesc['animated']): LayerOf<'loading'> => ({ kind: 'loading', part: 'ridge', id: 'loading.crest', surface: 'land',
    z: 49, key: 'k', bounds: { x: 0, y: 40, w: 100, h: 40 }, line: [[0, 50], [100, 50]], rgb: [0.3, 0.3, 0.4], alpha: 0.6, mass: 20, seed: 1,
    animated })

  it('lays a forming line within its window, feathered, and an unmade one outside it', () => {
    const visible = argsCanvas(200, 256)
    const surface = new Surface(visible, { factory: argsCanvas, now: () => 0, painters: () => ({ form: () => {} }) })
    surface.resize(100, 128, 2)
    const reveal = { x: 50, at: 0, dur: 1, still: 'hide' as const, feather: 10 }
    surface.render([ridge({ mode: 'settle', reveal })], 0.25)
    const blits = () => visible.calls.filter((c) => c[0] === 'drawImage').map((c) => [c[2] as number, c[4] as number])
    const made = blits()
    const reach = revealAt({ mode: 'settle', reveal }, 0.25, 100)
    // The core window, in device px, and feathered slices beyond it on both sides.
    expect(made).toContainEqual([Math.round((50 - reach) * 2), Math.round((50 + reach) * 2) - Math.round((50 - reach) * 2)])
    expect(made.length).toBe(11)
    visible.calls.length = 0
    surface.render([ridge({ mode: 'settle', reveal: { ...reveal, erase: true } })], 0.25)
    const unmade = blits()
    // The complement: nothing laid inside the window.
    for (const [x, w] of unmade) expect(x + w <= Math.round((50 - reach) * 2) || x >= Math.round((50 + reach) * 2)).toBe(true)
    // Hidden under reduced motion until it is whole.
    visible.calls.length = 0
    surface.render([ridge({ mode: 'settle', reveal })], 0.5, true)
    expect(blits()).toEqual([])
  })

  it('lays a gliding layer off its place, settling to it', () => {
    const visible = argsCanvas(200, 256)
    const surface = new Surface(visible, { factory: argsCanvas, now: () => 0, painters: () => ({ form: () => {} }) })
    surface.resize(100, 128, 2)
    const glide = { dy: 6, at: 0, dur: 1 }
    const layer = { ...ridge({ mode: 'settle', glide }), id: 'clouds.low', surface: 'sky' as const }
    surface.render([layer], 0)
    const y = () => visible.calls.filter((c) => c[0] === 'drawImage').map((c) => c.length > 4 ? c[c.length - 3] : c[3]).at(-1)
    // Painted for this desc: laid 6 px (12 device px) off, at the start of the glide.
    expect(y()).toBe(80 + 12)
    visible.calls.length = 0
    surface.render([layer], 1)
    expect(y()).toBe(80)
  })
})

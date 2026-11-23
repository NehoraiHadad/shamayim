import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { WorldInput } from '../../world/types'
import { buildWorld } from '../../world/world'
import { sceneModel } from '../model'
import type { LayerDesc, LayerKind, LayerOf, SceneBox, SceneModel } from '../model/types'
import { HAND, type Ctx2D, type PaintEnv } from './hand'
import { painterOf, SCENE_STYLES, STYLES } from './styles'

/** Every style's weather, water and town painters: pure in the phase, and a loop later the same frame (C7). */
const DAY = '2026-11-17'
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const PLACES = ['haifa', 'tiberias', 'jerusalem', 'rosh-pina']
const KINDS = new Set<LayerKind>(['shafts', 'fall', 'mist', 'grains', 'rays', 'smoke', 'sheen', 'edge', 'water', 'outside'])
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces(SCENE_PLACES.filter((p) => PLACES.includes(p.id)))
})
afterAll(() => { vi.unstubAllGlobals() })

const at = (hour: string) => `${DAY}T${hour}` as LocalTime
const world = (id: string, hour: string, forced: WorldInput['forced']) =>
  buildWorld({ ...worldInput(loaded.get(id)!, at('12:00')), selected: at(hour), forced })
const ofKind = <K extends LayerKind>(model: SceneModel, kind: K) => model.layers.filter((l): l is LayerOf<K> => l.kind === kind)

const RAIN = (windDirection: number) => ({ precipitation: 4, weatherCode: 63, cloudCover: 95, thickCloud: 90, windSpeed: 35, windGusts: 55,
  windDirection, humidity: 95 })
const SHOWERS = { precipitation: 0.6, weatherCode: 80, cloudCover: 55, thickCloud: 40, windSpeed: 25, windGusts: 45, windDirection: 250, humidity: 80 }
const CLEAR = { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0, humidity: 40, visibilityKm: 30 }
const BROKEN = { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2, humidity: 60, visibilityKm: 25 }
const FOG = { humidity: 99, visibilityKm: 1.5, cloudCover: 60, thickCloud: 30, precipitation: 0, weatherCode: 45, windSpeed: 6 }
const DUST = { pm10: 400, dust: 400, visibilityKm: 3, humidity: 30 }

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

it.each(SCENE_STYLES)('%s: paints the same calls twice and the same frame a loop later', (style) => {
  const cases: LayerDesc[] = []
  const add = (model: SceneModel) => {
    for (const l of model.layers) if (KINDS.has(l.kind) && (l.animated || !['water', 'outside'].includes(l.kind))) cases.push(l)
  }
  const wet = world('haifa', '12:00', RAIN(270))
  add(sceneModel(wet, BOX, null, undefined, STYLES[style].light))
  const distant = wet.rain!.cells.find(cell => !cell.atEye)!
  const camera = { ...wet.camera, heading: (distant.fromAzimuth + distant.toAzimuth) / 2 + 180 }
  const outOfView = sceneModel({ ...wet, camera, rain: { ...wet.rain!, cells: [distant], near: false } }, BOX, null, undefined, STYLES[style].light)
  expect(ofKind(outOfView, 'edge')).toHaveLength(1)
  add(outOfView)
  add(sceneModel(world('haifa', '16:30', BROKEN), BOX, null, undefined, STYLES[style].light))
  add(sceneModel(world('tiberias', '07:30', { ...FOG, windSpeed: 25 }), BOX, null, undefined, STYLES[style].light))
  add(sceneModel(world('jerusalem', '12:00', DUST), BOX, null, undefined, STYLES[style].light))
  add(sceneModel(world('jerusalem', '12:00', SHOWERS), BOX, null, undefined, STYLES[style].light))
  add(sceneModel(world('rosh-pina', '12:00', { ...CLEAR, windSpeed: 50 }), BOX, null, undefined, STYLES[style].light))
  const kinds = new Set(cases.map((l) => l.kind))
  for (const kind of KINDS) expect(kinds.has(kind), kind).toBe(true)
  for (const desc of cases) {
    const painter = painterOf(desc, style)!, paint = (painter.light ?? painter.form) as (ctx: Ctx2D, desc: never, env: PaintEnv) => void
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

import { describe, expect, it } from 'vitest'
import type { LayerDesc } from '../model/types'
import type { Painter } from '../paint/contract'
import { DEFAULT_STYLE, SCENE_STYLES, STYLES, isSceneStyle, painterOf, styleKey, type SceneStyle } from '../paint/styles'
import { LayerCache, type LayerCanvas } from './layerCache'
import { formKeyOf, type PaintRequest } from './paintJob'
import { makeWorkerRunner, type WorkerCanvas } from './paintWorkerRun'
import { RemoteCache, type WorkerLike } from './remoteCache'
import { Surface } from './surface'

const canvas = (width: number, height: number) => ({ width, height, transferToImageBitmap: () => ({ close() {} }),
  getContext: () => new Proxy({}, { get: () => () => undefined, set: () => true }) }) as unknown as LayerCanvas & WorkerCanvas

/** A layer of a kind, for the caches' bookkeeping alone (its painter is never run). */
const layer = (kind: LayerDesc['kind']) => ({ kind, id: kind, surface: 'land', z: 1, key: 'k', light: { key: 'l' },
  bounds: { x: 0, y: 0, w: 20, h: 10 } }) as unknown as LayerDesc
const base = STYLES[DEFAULT_STYLE].painters
const KINDS = Object.keys(base) as (keyof typeof base)[]
/** The styles but the default: what each paints its own way, and what it shares. */
const OTHERS = SCENE_STYLES.filter((style): boolean => style !== DEFAULT_STYLE).map((style) => {
  const painters = STYLES[style].painters
  return { style, own: KINDS.filter((kind) => painters[kind] !== base[kind]), shared: KINDS.filter((kind) => painters[kind] === base[kind]) }
})

describe('scene style', () => {
  it('names the hands by their ids in the registry', () => {
    expect(SCENE_STYLES.every(isSceneStyle)).toBe(true)
    for (const style of SCENE_STYLES) expect(STYLES[style].id).toBe(style)
    expect(isSceneStyle('sketch')).toBe(false)
    expect(isSceneStyle(null)).toBe(false)
  })

  it('paints every kind in every style, and the default where none is asked for', () => {
    for (const kind of KINDS) {
      for (const style of SCENE_STYLES) expect(painterOf(layer(kind), style)).toBe(STYLES[style].painters[kind])
      expect(painterOf(layer(kind))).toBe(base[kind])
      expect(formKeyOf(layer(kind), 2, DEFAULT_STYLE).key).toBe('k@2:0,0,20,10')
      expect(formKeyOf(layer(kind), 2).key).toBe('k@2:0,0,20,10')
    }
    for (const style of SCENE_STYLES) expect(painterOf(layer('contrail'), style)).toBeUndefined()
  })

  it.each(OTHERS)('keeps the key of a layer the $style hand shares, and marks the ones it paints its own way', ({ style, own, shared }) => {
    for (const kind of shared) expect(styleKey(layer(kind), style)).toBe('')
    for (const kind of own) expect(formKeyOf(layer(kind), 2, style).key).toBe(`k@2:0,0,20,10~${style}`)
    expect(styleKey(layer('contrail'), style)).toBe('')
  })

  it.each(OTHERS)('repaints what the $style hand paints its own way when the style switches, and only that', ({ style: other, own: [own], shared: [shared] }) => {
    const painted: string[] = []
    const painters = (desc: LayerDesc, style: SceneStyle): Painter => ({ light: () => undefined,
      form: () => { painted.push(`${desc.kind} ${style}`) } })
    const cache = new LayerCache({ factory: canvas, painters, now: () => 0 })
    const both = [layer(own), layer(shared)]
    for (const style of [DEFAULT_STYLE, other, other, DEFAULT_STYLE]) {
      cache.style = style
      both.forEach((desc) => cache.update(desc, 2))
    }
    expect(painted).toEqual([`${own} ${DEFAULT_STYLE}`, `${shared} ${DEFAULT_STYLE}`, `${own} ${other}`, `${own} ${DEFAULT_STYLE}`])
  })

  it.each(OTHERS)('asks the paint worker for the layer in the $style style', ({ style, own: [own] }) => {
    const sent: PaintRequest[] = []
    const worker = { postMessage: (message: PaintRequest) => { sent.push(message) }, terminate() {}, onmessage: null, onerror: null }
    const cache = new RemoteCache({ worker: worker as unknown as WorkerLike, onArrive() {}, onFail() {} })
    cache.style = style
    expect(cache.fresh(layer(own), 2)).toBe(false)
    cache.update(layer(own), 2)
    cache.flush()
    expect(sent[0].jobs[0].style).toBe(style)
    expect(sent[0].jobs[0].formKey).toContain(`~${style}`)
  })

  it.each(OTHERS)('revisits a frame-batched render with the same layer array when the style turns $style', ({ style: other, own: [own], shared: [shared] }) => {
    const painted: string[] = []
    const painters = (desc: LayerDesc, style: SceneStyle): Painter => ({ form: () => { painted.push(`${desc.kind} ${style}`) } })
    const surface = new Surface(canvas(20, 10), { factory: canvas, painters, now: () => 0 })
    const layers = [layer(own), layer(shared)]
    surface.resize(20, 10, 1)
    surface.render(layers)
    surface.style = other
    surface.render(layers)
    surface.render(layers)
    surface.style = DEFAULT_STYLE
    surface.render(layers)
    expect(painted).toEqual([`${own} ${DEFAULT_STYLE}`, `${shared} ${DEFAULT_STYLE}`, `${own} ${other}`, `${own} ${DEFAULT_STYLE}`])
  })

  it.each(OTHERS)('uses the stored hand when filling an older strip before the next render ($style)', ({ style: other, own: [own] }) => {
    const painted: unknown[] = []
    const cache = new LayerCache({ factory: canvas, now: () => 0, painters: (_, style) => ({
      form: (_ctx, _desc, env) => { painted.push([style, env.phase]) },
    }) })
    const strip: LayerDesc = { ...layer(own), animated: { mode: 'frames', frames: { count: 4, fps: 2 } } }
    cache.update(strip, 1)
    cache.style = other
    cache.ensureFrame(strip, .5)
    cache.update(strip, 1, .5)
    expect(painted).toEqual([[DEFAULT_STYLE, 0], [DEFAULT_STYLE, .5], [other, .5]])
  })

  it.each(SCENE_STYLES)('paints a job in its style on the worker (%s)', (style) => {
    const asked: unknown[] = []
    const run = makeWorkerRunner({ createCanvas: canvas, now: () => 0, painterOf: (_, style) => {
      asked.push(style)
      return { form: () => { asked.push('painted') } }
    } })
    run([{ id: 'a', part: 'form', key: 'k', formKey: 'k', desc: layer('sky'), ratio: 1, rect: { x: 0, y: 0, w: 20, h: 10 },
      phase: 0, hand: { grain: 1 }, style }])
    expect(asked).toEqual([style, 'painted'])
  })
})

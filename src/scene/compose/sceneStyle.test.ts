import { describe, expect, it } from 'vitest'
import { SCENE_STYLES, isSceneStyle, type SceneStyle } from '../sceneStyle'
import type { LayerDesc } from '../model/types'
import { PAINTERS, painterOf, styleKey, type Painter } from '../paint'
import { DRAWN } from '../paint/drawn'
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
const KINDS = Object.keys(PAINTERS) as LayerDesc['kind'][]
/** A kind the drawn hand paints its own way, and one both hands share. */
const own = KINDS.find((kind) => DRAWN[kind]), shared = KINDS.find((kind) => !DRAWN[kind])!

describe('scene style', () => {
  it('names the two hands', () => {
    expect(SCENE_STYLES.every(isSceneStyle)).toBe(true)
    expect(isSceneStyle('sketch')).toBe(false)
    expect(isSceneStyle(null)).toBe(false)
  })

  it('gives the real hand its own painters and keys, whatever the drawn one has', () => {
    for (const kind of KINDS) {
      expect(painterOf(layer(kind), 'real')).toBe(PAINTERS[kind])
      expect(painterOf(layer(kind))).toBe(PAINTERS[kind])
      expect(painterOf(layer(kind), 'drawn')).toBe(DRAWN[kind] ?? PAINTERS[kind])
      expect(formKeyOf(layer(kind), 2, 'real').key).toBe('k@2:0,0,20,10')
      expect(formKeyOf(layer(kind), 2).key).toBe('k@2:0,0,20,10')
    }
  })

  it('keeps the key of a layer both hands paint alike', () => {
    expect(styleKey(layer(shared), 'drawn')).toBe('')
    if (own) expect(formKeyOf(layer(own), 2, 'drawn').key).toBe('k@2:0,0,20,10~drawn')
  })

  it.skipIf(!own)('repaints what the hands paint differently when the style switches, and only that', () => {
    const painted: string[] = []
    const painters = (desc: LayerDesc, style: SceneStyle): Painter => ({ light: () => undefined,
      form: () => { painted.push(`${desc.kind} ${style}`) } })
    const cache = new LayerCache({ factory: canvas, painters, now: () => 0 })
    const both = [layer(own!), layer(shared)]
    for (const style of ['real', 'drawn', 'drawn', 'real'] as const) {
      cache.style = style
      both.forEach((desc) => cache.update(desc, 2))
    }
    expect(painted).toEqual([`${own} real`, `${shared} real`, `${own} drawn`, `${own} real`])
  })

  it.skipIf(!own)('asks the paint worker for the layer in the new style', () => {
    const sent: PaintRequest[] = []
    const worker = { postMessage: (message: PaintRequest) => { sent.push(message) }, terminate() {}, onmessage: null, onerror: null }
    const cache = new RemoteCache({ worker: worker as unknown as WorkerLike, onArrive() {}, onFail() {} })
    cache.style = 'drawn'
    expect(cache.fresh(layer(own!), 2)).toBe(false)
    cache.update(layer(own!), 2)
    cache.flush()
    expect(sent[0].jobs[0].style).toBe('drawn')
    expect(sent[0].jobs[0].formKey).toContain('~drawn')
  })

  it('revisits a frame-batched render with the same layer array when the style changes', () => {
    const painted: string[] = []
    const painters = (desc: LayerDesc): Painter => ({
      form: (_ctx, _desc, env) => { painted.push(`${desc.kind} ${env.style}`) },
    })
    const surface = new Surface(canvas(20, 10), { factory: canvas, painters, now: () => 0 })
    const layers = [layer('cloudSheet'), layer(shared)]
    surface.resize(20, 10, 1)
    surface.render(layers)
    surface.style = 'drawn'
    surface.render(layers)
    surface.render(layers)
    surface.style = 'real'
    surface.render(layers)
    expect(painted).toEqual(['cloudSheet real', `${shared} real`, 'cloudSheet drawn', 'cloudSheet real'])
  })

  it('uses the stored hand when filling an older strip before the next render', () => {
    const painted: unknown[] = []
    const cache = new LayerCache({ factory: canvas, now: () => 0, painters: () => ({
      form: (_ctx, _desc, env) => { painted.push([env.style, env.phase]) },
    }) })
    const strip: LayerDesc = { ...layer('outside'), animated: { mode: 'frames', frames: { count: 4, fps: 2 } } }
    cache.update(strip, 1)
    cache.style = 'drawn'
    cache.ensureFrame(strip, .5)
    cache.update(strip, 1, .5)
    expect(painted).toEqual([['real', 0], ['real', .5], ['drawn', .5]])
  })

  it('hands the job style to the worker painter and its env', () => {
    const asked: unknown[] = []
    const run = makeWorkerRunner({ createCanvas: canvas, now: () => 0, painterOf: (_, style) => {
      asked.push(style)
      return { form: (_ctx, _desc, env) => { asked.push(env.style) } }
    } })
    run([{ id: 'a', part: 'form', key: 'k', formKey: 'k', desc: layer(shared), ratio: 1, rect: { x: 0, y: 0, w: 20, h: 10 },
      phase: 0, hand: { grain: 1 }, style: 'drawn' }])
    expect(asked).toEqual(['drawn', 'drawn'])
  })
})

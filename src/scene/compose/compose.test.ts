import { describe, expect, it } from 'vitest'
import type { LayerDesc, LayerOf } from '../model/types'
import type { Painter } from '../paint'
import { LayerCache, type LayerCanvas } from './layerCache'
import { makeLoop } from './loop'
import { paintSliced } from './schedule'
import { makeStats } from './stats'
import { Surface } from './surface'

/** A canvas that records what is done to it (node has no canvas). */
function fakeCanvas(width: number, height: number) {
  const calls: string[] = []
  const ctx = new Proxy({ calls }, {
    get: (target, prop) => (prop === 'calls' ? target.calls : (...args: unknown[]) => { calls.push(`${String(prop)}(${args.length})`) }),
    set: (_, prop, value) => { calls.push(`${String(prop)}=${String(value)}`); return true },
  })
  return { width, height, calls, getContext: () => ctx } as unknown as LayerCanvas & { calls: string[] }
}

function plane(key: string, lightKey: string, id = 'plane.near'): LayerOf<'plane'> {
  return { kind: 'plane', plane: 'near', id, surface: 'land', z: 30, key, bounds: { x: 0, y: 40, w: 375, h: 88 },
    outline: [[0, 50], [375, 60], [375, 128], [0, 128]], fill: [0.4, 0.4, 0.4], faces: [], gullies: [], terraces: [], scrub: [],
    grain: { amount: 0, seed: 1 }, light: { key: lightKey, blend: 'source-over', tint: [0.2, 0.2, 0.3], faces: [] } }
}

function counting() {
  const count = { form: 0, light: 0 }
  const painter: Painter = { form: () => { count.form++ }, light: () => { count.light++ } }
  return { count, painters: () => painter }
}

describe('layer cache', () => {
  it('does not repaint a layer whose key is unchanged', () => {
    const { count, painters } = counting()
    const cache = new LayerCache({ factory: fakeCanvas, painters, now: () => 0 })
    expect(cache.update(plane('a', 'l1'), 2)).toBe('form')
    expect(cache.update(plane('a', 'l1'), 2)).toBe('none')
    expect(cache.update(plane('a', 'l1'), 2)).toBe('none')
    expect(count).toEqual({ form: 1, light: 1 })
  })

  it('repaints only the light canvas when only the light changes (a scrub frame)', () => {
    const { count, painters } = counting()
    const cache = new LayerCache({ factory: fakeCanvas, painters, now: () => 0 })
    cache.update(plane('a', 'l1'), 2)
    expect(cache.update(plane('a', 'l2'), 2)).toBe('light')
    expect(cache.update(plane('a', 'l3'), 2)).toBe('light')
    expect(count).toEqual({ form: 1, light: 3 })
    // A new form repaints its light too (the light keeps inside the form's shape).
    expect(cache.update(plane('b', 'l3'), 2)).toBe('form')
    expect(count).toEqual({ form: 2, light: 4 })
  })

  it('repaints at a new pixel ratio and sizes canvases to bounds × ratio in whole device px', () => {
    const { count, painters } = counting()
    const made: LayerCanvas[] = []
    const cache = new LayerCache({ factory: (w, h) => { const c = fakeCanvas(w, h); made.push(c); return c }, painters, now: () => 0 })
    cache.update(plane('a', 'l1'), 2)
    expect([made[0].width, made[0].height]).toEqual([750, 176])
    expect(cache.update(plane('a', 'l1'), 3)).toBe('form')
    expect(count.form).toBe(2)
    const sky: LayerOf<'sky'> = { kind: 'sky', id: 'sky', surface: 'sky', z: 0, key: 's', soft: true,
      bounds: { x: 0, y: 0, w: 375, h: 428 }, stops: [], glow: [], band: null }
    cache.update(sky, 2.75)
    expect([made.at(-1)!.width, made.at(-1)!.height]).toEqual([1032, 1177])
    expect(cache.peek('sky')!.rect).toEqual({ x: 0, y: 0, w: 1032, h: 1177 })
    expect(cache.peek('plane.near')!.rect).toEqual({ x: 0, y: 120, w: 1125, h: 264 })
  })

  it('counts hits and paints, prunes layers no longer drawn and adds up its memory', () => {
    const stats = makeStats(() => 0)
    const { painters } = counting()
    const cache = new LayerCache({ factory: fakeCanvas, painters, stats, now: () => 0 })
    cache.update(plane('a', 'l1'), 1)
    cache.update(plane('a', 'l1'), 1)
    cache.update(plane('a', 'l2'), 1)
    expect(stats.layers['plane.near']).toMatchObject({ paints: 1, lightPaints: 1, hits: 1 })
    expect(cache.bytes()).toBe(2 * 375 * 88 * 4)
    cache.prune(new Set())
    expect(cache.bytes()).toBe(0)
  })
})

describe('surface and schedule', () => {
  const layers = (n: number): LayerDesc[] => Array.from({ length: n }, (_, i) => plane(`k${i}`, 'l', `plane.${i}`))

  it('paints a cold start in slices under the budget, composites after each and resolves when done', async () => {
    let clock = 0
    const surface = new Surface(fakeCanvas(750, 256), { factory: fakeCanvas,
      painters: () => ({ form: () => { clock += 3 }, light: () => {} }), now: () => clock })
    surface.resize(375, 128, 2)
    const frames: (() => void)[] = []
    const slicer = paintSliced([{ surface, layers: layers(7) }], { budgetMs: 8, now: () => clock,
      frame: (cb) => frames.push(cb), cancelFrame: () => {} })
    while (frames.length) frames.shift()!()
    const report = await slicer.done
    expect(report.painted).toBe(7)
    // 3 ms a layer under an 8 ms budget: 3 + 3 + 1 layers.
    expect(report.slices.length).toBe(3)
    expect(Math.max(...report.slices)).toBeLessThanOrEqual(9)
    expect(layers(7).every((layer) => surface.fresh(layer))).toBe(true)
  })

  it('a warm frame repaints nothing when the model is the same', () => {
    const { count, painters } = counting()
    const surface = new Surface(fakeCanvas(750, 256), { factory: fakeCanvas, painters, now: () => 0 })
    surface.resize(375, 128, 2)
    surface.render(layers(3))
    expect(surface.render(layers(3))).toEqual(['none', 'none', 'none'])
    expect(count.form).toBe(3)
  })
})

describe('loop', () => {
  it('ticks at most 30 times a second with the phase since its start, and once under reduced motion', () => {
    const queue: ((t: number) => void)[] = []
    const phases: number[] = []
    const deps = { frame: (cb: (t: number) => void) => queue.push(cb), cancelFrame: () => {}, visible: () => true, still: () => false }
    const loop = makeLoop((phase) => phases.push(phase), deps)
    loop.start()
    for (let t = 1000; t <= 2000; t += 1000 / 60) queue.shift()!(t)
    expect(phases.length).toBeGreaterThanOrEqual(30)
    expect(phases.length).toBeLessThanOrEqual(31)
    expect(phases[0]).toBe(0)
    loop.stop()
    const still: number[] = []
    makeLoop((phase) => still.push(phase), { ...deps, still: () => true }).start()
    expect(still).toEqual([0])
  })
})

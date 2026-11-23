import { describe, expect, it } from 'vitest'
import { EMPTY_VEGETATION } from '../model/vegDescriptor'
import type { LayerDesc, LayerOf } from '../model/types'
import type { Painter } from '../paint'
import { LayerCache, type LayerCanvas } from './layerCache'
import { makeLoop } from './loop'
import { paintSliced, PRIORITY } from './schedule'
import { canvasSize, deviceRect, formKeyOf, type PaintReply, type PaintRequest } from './paintJob'
import { RemoteCache, type WorkerLike } from './remoteCache'
import { makeStats } from './stats'
import { Surface } from './surface'

/** A canvas that records what is done to it (node has no canvas). */
function fakeCanvas(width: number, height: number) {
  const calls: string[] = []
  const transforms: number[][] = []
  const ctx = new Proxy({ calls }, {
    get: (target, prop) => (prop === 'calls' ? target.calls : (...args: unknown[]) => {
      calls.push(`${String(prop)}(${args.length})`)
      if (prop === 'setTransform') transforms.push(args as number[])
    }),
    set: (_, prop, value) => { calls.push(`${String(prop)}=${String(value)}`); return true },
  })
  return { width, height, calls, transforms, getContext: () => ctx } as unknown as LayerCanvas & { calls: string[]; transforms: number[][] }
}

function plane(key: string, lightKey: string, id = 'plane.near'): LayerOf<'plane'> {
  return { kind: 'plane', plane: 'near', id, surface: 'land', z: 30, key, bounds: { x: 0, y: 40, w: 375, h: 88 },
    outline: [[0, 50], [375, 60], [375, 128], [0, 128]], fill: [0.4, 0.4, 0.4],
    surfaceTone: { palette: [[0.4, 0.4, 0.4]], cols: 1, rows: 1, cells: [0], source: 'test' },
    gullies: [], terraces: [], vegetation: EMPTY_VEGETATION, grain: { amount: 0, seed: 1 },
    light: { key: lightKey, blend: 'source-over', litField: { cols: 1, rows: 1, grid: new Uint8Array([0, 0, 255, 0]),
      eSun: [0, 0, 0], eMoon: [0, 0, 0], eSky: [1, 1, 1], hazeLin: [0, 0, 0], yHorizon: 1 } } }
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
      bounds: { x: 0, y: 0, w: 375, h: 428 }, stops: [], glow: [], arch: null, band: null }
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
    expect(PRIORITY.canopy).toBeGreaterThan(PRIORITY.plane)
  })

  it('a warm frame repaints nothing when the model is the same', () => {
    const { count, painters } = counting()
    const surface = new Surface(fakeCanvas(750, 256), { factory: fakeCanvas, painters, now: () => 0 })
    surface.resize(375, 128, 2)
    surface.render(layers(3))
    expect(surface.render(layers(3))).toEqual(['none', 'none', 'none'])
    expect(count.form).toBe(3)
  })

  it('composes a widening trail at each phase without a cached raster and holds it under reduced motion', () => {
    const canvas = fakeCanvas(375, 428), surface = new Surface(canvas, { factory: fakeCanvas })
    surface.resize(375, 428, 1)
    const projection = (x: number) => Array.from({ length: 3 }, () => ({ point: [x, 20] as [number, number], widthPerM: 0.02, visibility: 0.8 }))
    const trail: LayerOf<'contrail'> = {
      id: 'contrail.a', kind: 'contrail', surface: 'sky', z: 6, key: 'trail',
      bounds: { x: 0, y: 0, w: 375, h: 300 }, rgb: [0.9, 0.9, 0.9], shade: [0.8, 0.8, 0.8],
      placed: { x: 0, y: 0, scale: 1, alpha: 1 },
      animated: { mode: 'settle', flight: { open: true, at: 0, path: [[0, 0]], step: 2 } },
      trail: { lifeS: 1_200, spreadM: 1_800, endInS: -1, head: null,
        puffs: [{ samples: projection(30), seed: 1, ageS: 20 }, { samples: projection(40), seed: 2, ageS: 0 }] },
    }
    const widths = () => canvas.calls.filter((call) => call.startsWith('lineWidth='))
    expect(surface.render([trail], 0)).toEqual(['none'])
    const start = widths()
    expect(start.length).toBeGreaterThan(0)
    canvas.calls.length = 0
    expect(surface.render([trail], 45)).toEqual(['none'])
    expect(widths()).not.toEqual(start)
    expect(surface.peek(trail.id)).toBeNull()
    canvas.calls.length = 0
    surface.render([trail], 45, true)
    expect(widths()).toEqual(start)
  })
})

/** A worker that keeps what it is sent and answers when told (node has no worker). */
function fakeWorker() {
  const sent: PaintRequest[] = []
  const closed: string[] = []
  const worker: WorkerLike & { sent: PaintRequest[]; closed: string[]; answer(): void; terminated: boolean } = {
    sent, closed, terminated: false,
    postMessage: (message) => { sent.push(message) },
    onmessage: null,
    onerror: null,
    terminate() { worker.terminated = true },
    answer() {
      const request = sent.shift()!
      const reply: PaintReply = { batch: request.batch, results: request.jobs.map((job) => {
        const { w, h } = canvasSize(job.desc, job.rect)
        const bitmap = job.final === false ? null
          : { width: w, height: h, close: () => { closed.push(`${job.id}:${job.part}:${job.key}`) } } as unknown as ImageBitmap
        return { id: job.id, part: job.part, key: job.key, formKey: job.formKey, ratio: job.ratio, rect: job.rect, ms: 1, bitmap }
      }) }
      worker.onmessage?.({ data: reply } as MessageEvent<PaintReply>)
    },
  }
  return worker
}

describe('painting in the worker', () => {
  const painters = () => ({ form: () => {}, light: () => {} })

  it('asks for a cold layer\'s form and light in one batch and shows them once they arrive', async () => {
    const worker = fakeWorker()
    const arrivals: boolean[] = []
    const cache = new RemoteCache({ worker, painters, now: () => 0, onArrive: ({ settled }) => arrivals.push(settled), onFail: () => {} })
    expect(cache.update(plane('a', 'l1'), 2)).toBe('form')
    cache.flush()
    expect(worker.sent).toHaveLength(1)
    expect(worker.sent[0].jobs.map((job) => job.part)).toEqual(['form', 'light'])
    expect(cache.peek('plane.near')).toBeNull()
    expect(cache.fresh(plane('a', 'l1'), 2)).toBe(false)
    const settled = cache.whenSettled()
    worker.answer()
    await settled
    expect(arrivals).toEqual([true])
    expect(cache.fresh(plane('a', 'l1'), 2)).toBe(true)
    expect(cache.peek('plane.near')).toMatchObject({ ratio: 2, rect: { x: 0, y: 80, w: 750, h: 176 } })
    expect(cache.update(plane('a', 'l1'), 2)).toBe('none')
    cache.flush()
    expect(worker.sent).toHaveLength(0)
  })

  it('keeps the last light while a scrub frame\'s light is painted, and sends only the newest ask after a batch', () => {
    const worker = fakeWorker()
    const cache = new RemoteCache({ worker, painters, now: () => 0, onArrive: () => {}, onFail: () => {} })
    cache.update(plane('a', 'l1'), 2)
    cache.flush()
    worker.answer()
    const shown = cache.peek('plane.near')!.light
    expect(cache.update(plane('a', 'l2'), 2)).toBe('light')
    cache.flush()
    expect(worker.sent[0].jobs.map((job) => [job.part, job.key])).toEqual([['light', 'l2']])
    // The lit terrain painter keeps the ground palette and leaves upright vegetation to the canopy job.
    const lightPlane = worker.sent[0].jobs[0].desc as LayerOf<'plane'>
    expect(lightPlane.surfaceTone.cells).toEqual([0])
    expect(lightPlane.vegetation.trees.byteLength).toBe(0)
    expect(lightPlane.vegetation.tufts.byteLength).toBe(0)
    // While l2 is on its way the hand moves on twice: only the newest is sent, once l2 is back.
    cache.update(plane('a', 'l3'), 2)
    cache.flush()
    cache.update(plane('a', 'l4'), 2)
    cache.flush()
    expect(worker.sent).toHaveLength(1)
    expect(cache.peek('plane.near')!.light).toBe(shown)
    worker.answer()
    expect(worker.sent.map((request) => request.jobs.map((job) => job.key))).toEqual([['l4']])
    expect(worker.closed).toEqual(['plane.near:light:l1'])
    worker.answer()
    expect(cache.fresh(plane('a', 'l4'), 2)).toBe(true)
    expect(cache.settled()).toBe(true)
  })

  it.each([true, false])('keeps the last worker picture through a form change and strip toggle (formless=%s)', (formless) => {
    const worker = fakeWorker()
    const cache = new RemoteCache({ worker, painters: () => ({ ...painters(), formless: () => formless }),
      onArrive: () => {}, onFail: () => {} })
    const a = plane('a', 'l1'), b = plane('b', 'l2')
    b.bounds = { x: 6, y: 44, w: 340, h: 78 }
    const strip: typeof b = { ...b, animated: { mode: 'frames', frames: { count: 4, fps: 2 } } }
    const send = (layer: typeof a, dpr: number) => {
      cache.update(layer, dpr)
      cache.flush()
    }
    const peek = () => cache.peek(a.id)
    const checkArrival = (layer: typeof a, dpr: number) => {
      expect(cache.fresh(layer, dpr)).toBe(true)
      const shown = peek()!
      expect(shown.desc).toBe(layer)
      expect(shown.rect).toEqual(deviceRect(layer, dpr))
      expect(shown.formKey).toBe(formKeyOf(layer, dpr).key)
      expect(shown.ratio).toBe(dpr)
      expect(shown.form === null).toBe(formless)
      expect(shown.light?.height).toBe(canvasSize(layer, shown.rect).h)
      return shown
    }

    send(a, 1)
    expect(peek()).toBeNull()
    expect(worker.sent[0].jobs.map(({ part }) => part)).toEqual(formless ? ['light'] : ['form', 'light'])
    worker.answer()
    let shown = checkArrival(a, 1)
    for (const layer of [b, strip]) {
      send(layer, 2)
      expect(cache.fresh(layer, 2)).toBe(false)
      expect(peek()).toEqual(shown)
      expect(peek()?.desc).toBe(shown.desc)
      expect(peek()?.light).toBe(shown.light)
      const closed = worker.closed.length
      worker.answer()
      // A strip paints in bounded chunks, form and light in turn (`remoteQueue.ts`): the old picture stays until both are in.
      while (!cache.fresh(layer, 2)) {
        expect(peek()?.light).toBe(shown.light)
        worker.answer()
      }
      expect(worker.closed).toHaveLength(closed + (formless ? 1 : 2))
      shown = checkArrival(layer, 2)
    }

    // The viewport keeps changing before each reply, but each completed picture is shown.
    const resizes = Array.from({ length: 7 }, (_, i) => ({
      ...plane(`resize${i}`, 'l3'), bounds: { x: i, y: 40, w: 360 + i, h: 88 },
    }))
    send(resizes[0], 1)
    for (let i = 0; i < resizes.length - 1; i += 2) {
      send(resizes[i + 1], 1)
      send(resizes[i + 2], 1)
      expect(peek()).toEqual(shown)
      worker.answer()
      expect(peek()?.desc).toBe(resizes[i])
      expect(peek()?.rect).toEqual(deviceRect(resizes[i], 1))
      expect(cache.fresh(resizes[i + 2], 1)).toBe(false)
      // Light-only jobs carry the trimmed desc (`lightJobDesc`): the newest resize is the one queued.
      expect(worker.sent[0].jobs[0].rect).toEqual(deviceRect(resizes[i + 2], 1))
      shown = peek()!
    }
    worker.answer()
    checkArrival(resizes.at(-1)!, 1)
  })

  it('queues a compatible form when an intermediate picture replaces the form a waiting light needs', () => {
    const worker = fakeWorker()
    const cache = new RemoteCache({ worker, painters, onArrive: () => {}, onFail: () => {} })
    cache.update(plane('a', 'l1'), 1)
    cache.flush()
    worker.answer()
    cache.update(plane('b', 'l1'), 1)
    cache.flush()
    const final = plane('a', 'l2')
    expect(cache.update(final, 1)).toBe('light')
    worker.answer()
    expect(cache.peek(final.id)?.desc.key).toBe('b')
    expect(worker.sent[0].jobs.map(({ part }) => part).sort()).toEqual(['form', 'light'])
    worker.answer()
    expect(cache.fresh(final, 1)).toBe(true)
  })

  it.each([true, false])('uses the in-flight A reply on an A → S → A scrub (formless=%s)', (formless) => {
    const worker = fakeWorker()
    const cache = new RemoteCache({ worker, painters: () => ({ ...painters(), formless: () => formless }),
      onArrive: () => {}, onFail: () => {} })
    const s = plane('s', 'sky'), a = plane('a', 'afternoon')
    const send = (layer: typeof a) => {
      cache.update(layer, 1)
      cache.flush()
    }
    send(s)
    worker.answer()
    const shown = cache.peek(s.id)!.light

    send(a) // A's job is in flight while S is still displayed.
    send(s) // Reusing S advances the displayed generation past A's job.
    send(plane('intermediate', 'queued'))
    const back = { ...a, z: a.z + 1 }
    expect(cache.update(back, 1)).toBe('none')
    cache.flush()
    expect(cache.peek(s.id)!.light).toBe(shown)
    expect(worker.sent).toHaveLength(1)
    worker.answer()

    expect(cache.fresh(back, 1)).toBe(true)
    expect(cache.peek(a.id)?.desc).toBe(back)
    expect(cache.peek(a.id)?.light).not.toBe(shown)
    expect(worker.sent).toHaveLength(0)
    expect(cache.settled()).toBe(true)
  })

  it('sends single-frame terrain layers before multi-frame strips so animated canopies do not block first terrain paint', async () => {
    const worker = fakeWorker()
    const arrivals: boolean[] = []
    const cache = new RemoteCache({ worker, painters, now: () => 0, onArrive: ({ settled }) => arrivals.push(settled), onFail: () => {} })
    const animatedCanopy: LayerOf<'canopy'> = {
      kind: 'canopy', id: 'canopy.near', surface: 'land', z: 30.1, key: 'c1', bounds: { x: 0, y: 40, w: 375, h: 88 },
      outline: [[0, 50], [375, 60], [375, 128], [0, 128]], clear: [], wind: { lean: -0.5, gust: -0.25 },
      vegetation: { seed: 1, tones: [], trees: new Float32Array(), treeMeta: new Uint8Array(), tufts: new Float32Array(), tuftMeta: new Uint8Array() },
      animated: { mode: 'frames', frames: { count: 10, fps: 5 } },
      light: { key: 'cl1', blend: 'source-over' },
    }
    cache.update(plane('a', 'l1'), 2)
    cache.update(animatedCanopy, 2)
    cache.flush()
    // Batch 1 contains only the single-frame terrain plane; the 10-frame canopy strip waits in pending.
    expect(worker.sent).toHaveLength(1)
    expect(worker.sent[0].jobs.map((job) => `${job.id}:${job.part}`)).toEqual(['plane.near:form', 'plane.near:light'])
    const settled = cache.whenSettled()
    worker.answer()
    // Terrain is already fresh and composited while the animated canopy strip begins painting in bounded chunks.
    expect(cache.fresh(plane('a', 'l1'), 2)).toBe(true)
    expect(cache.fresh(animatedCanopy, 2)).toBe(false)
    expect(arrivals).toEqual([false])
    expect(worker.sent).toHaveLength(1)
    expect(worker.sent[0].jobs.map((job) => [job.id, job.part, job.frames, job.final])).toEqual([['canopy.near', 'form', [0, 1], false]])
    while (worker.sent.length) worker.answer()
    await settled
    expect(arrivals).toEqual([false, false, true])
    expect(cache.fresh(animatedCanopy, 2)).toBe(true)
  })

  it('lays the newest complete worker arrivals once in a frame and settles after the draw', async () => {
    const worker = fakeWorker(), callbacks: (() => void)[] = [], received: boolean[] = []
    const stats = makeStats(() => 0, { trackShown: true })
    const surface = new Surface(fakeCanvas(750, 256), { factory: fakeCanvas, painters: counting().painters,
      stats, worker: () => worker, scheduleArrival: cb => callbacks.push(cb),
      onArrive: a => received.push(a.settled) })
    surface.resize(375, 128, 2)
    surface.render([plane('a', 'l1')])
    worker.answer()
    surface.render([plane('a', 'l2')])
    surface.render([plane('a', 'l3')])
    worker.answer()
    worker.answer()
    expect(callbacks).toHaveLength(1)
    expect(received).toEqual([])
    const settled = surface.settled()
    callbacks.shift()!()
    await settled
    expect(received).toEqual([true])
    expect(stats.shown['plane.near'].lightKey).toBe('l3')
  })

  it('lays the arrivals on the surface, reuses shown entries when trackShown is on, and paints on main thread once worker fails', () => {
    const worker = fakeWorker()
    const stats = makeStats(() => 0, { trackShown: true })
    const { count, painters: counted } = counting()
    let laid = 0
    const surface = new Surface(fakeCanvas(750, 256), { factory: fakeCanvas, painters: counted, stats, now: () => 0, worker: () => worker,
      onArrive: () => { laid++ } })
    surface.resize(375, 128, 2)
    surface.render([plane('a', 'l1')])
    expect(count).toEqual({ form: 0, light: 0 })
    expect(stats.shown['plane.near']).toBeUndefined()
    worker.answer()
    expect(laid).toBe(1)
    expect(surface.fresh(plane('a', 'l1'))).toBe(true)
    const entryRef = stats.shown['plane.near']
    expect(entryRef).toEqual({ key: 'a', lightKey: 'l1', fresh: true })
    // Stable re-composite reuses the same ShownLayer object without re-allocating.
    surface.composite([plane('a', 'l1')])
    expect(stats.shown['plane.near']).toBe(entryRef)
    surface.render([plane('b', 'l1')])
    expect(stats.shown['plane.near']).toEqual({ key: 'a', lightKey: 'l1', fresh: false })
    worker.answer()
    expect(stats.shown['plane.near']).toBe(entryRef)
    expect(stats.shown['plane.near']).toEqual({ key: 'b', lightKey: 'l1', fresh: true })
    surface.render([plane('b', 'l2')])
    worker.onerror?.(new Event('error'))
    expect(worker.terminated).toBe(true)
    expect(surface.remote).toBeNull()
    expect(count).toEqual({ form: 1, light: 1 })
    expect(surface.fresh(plane('b', 'l2'))).toBe(true)
    expect(stats.shown['plane.near']).toEqual({ key: 'b', lightKey: 'l2', fresh: true })

    // Default stats (trackShown: false) skips composite-key tracking completely.
    const quietStats = makeStats(() => 0)
    const quietSurface = new Surface(fakeCanvas(750, 256), { factory: fakeCanvas, painters: counted, stats: quietStats, now: () => 0 })
    quietSurface.resize(375, 128, 2)
    quietSurface.render([plane('a', 'l1')])
    expect(quietStats.shown).toEqual({})
  })
})

describe('compositing flights', () => {
  const layer = (key: string, x: number): LayerOf<'aircraft'> => ({
    kind: 'aircraft', id: 'aircraft.test', surface: 'sky', key, z: 1, bounds: { x: -5, y: -5, w: 10, h: 10 },
    placed: { x, y: 20, scale: 0.5, alpha: 0.8 }, x: 0, y: 0, angle: 0, size: 3, rgb: [1, 1, 1], lit: [1, 1, 1],
    lights: 0, landing: false, trail: 0, trailRgb: [1, 1, 1], seed: 0,
    animated: { mode: 'settle', flight: { open: true, at: 0, step: 2, path: [[0, 0], [0, 0]], scale: [1, 2],
      alpha: [1, 0.5], turn: [0, Math.PI / 2] } },
  })
  const painters = () => ({ form: () => {} })

  it('draws about the sprite origin, recompositing when only scale, opacity and turn change', () => {
    const canvas = fakeCanvas(100, 100)
    const surface = new Surface(canvas, { factory: fakeCanvas, painters })
    surface.resize(100, 100, 1)
    const layers = [layer('a', 10)]
    surface.render(layers, 0)
    surface.render(layers, 2)
    expect(canvas.transforms.at(-2)).toEqual([expect.closeTo(0, 6), 1, -1, expect.closeTo(0, 6), 10, 20])
    expect(canvas.calls).toContain('globalAlpha=0.4')
    expect(canvas.calls.filter((call) => call === 'clearRect(4)')).toHaveLength(2)
  })

  it.each(['local', 'worker'] as const)('lays a stale %s sprite with its last compatible placement and track', (mode) => {
    const canvas = fakeCanvas(100, 100)
    const worker = fakeWorker()
    const surface = new Surface(canvas, { factory: fakeCanvas, painters, worker: mode === 'worker' ? () => worker : undefined })
    const x = () => canvas.transforms.at(-2)![4]
    surface.resize(100, 100, 1)
    surface.render([layer('a', 10)])
    if (mode === 'worker') worker.answer()
    surface.render([layer('a', 20)])
    expect(x()).toBe(20)
    const b = layer('b', 70)
    b.animated!.flight!.path[1] = [8, 0]
    if (mode === 'worker') surface.render([b], 1)
    else surface.composite([b], 1)
    expect(x()).toBe(20)
    if (mode === 'worker') worker.answer()
    else surface.render([b], 1)
    expect(x()).toBe(74)
  })

  it('keeps the matching sprite when a superseded worker answer arrives after a scrub back', () => {
    const canvas = fakeCanvas(100, 100)
    const worker = fakeWorker()
    const surface = new Surface(canvas, { factory: fakeCanvas, painters, worker: () => worker })
    surface.resize(100, 100, 1)
    surface.render([layer('a', 10)])
    worker.answer()
    surface.render([layer('b', 70)])
    surface.render([layer('a', 20)])
    worker.answer()
    expect(canvas.transforms.at(-2)![4]).toBe(20)
    expect(worker.sent).toHaveLength(0)
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

  it('stops with a pending frame through an unbound cancel (the browser cancelAnimationFrame throws on a foreign this)', () => {
    const cancelled: number[] = []
    function cancelFrame(this: unknown, id: number) {
      if (this !== undefined) throw new TypeError('Illegal invocation')
      cancelled.push(id)
    }
    const loop = makeLoop(() => {}, { frame: () => 7, cancelFrame, visible: () => true, still: () => false })
    loop.start()
    expect(() => loop.stop()).not.toThrow()
    expect(cancelled).toEqual([7])
  })
})

describe('animation laid at composite time (C7)', () => {
  /** A canvas whose context logs each call with its arguments. */
  function argsCanvas(width: number, height: number) {
    const calls: unknown[][] = []
    const ctx = new Proxy({}, {
      get: (_t, prop) => (...args: unknown[]) => {
        calls.push([prop, ...args])
        return prop === 'createPattern' ? { pattern: true } : undefined
      },
      set: (_t, prop, value) => { calls.push([`${String(prop)}=`, value]); return true },
    })
    return { width, height, calls, getContext: () => ctx } as unknown as LayerCanvas & { calls: unknown[][] }
  }
  const smoke: LayerOf<'smoke'> = { kind: 'smoke', id: 'smoke.near', surface: 'land', z: 40, key: 'k', bounds: { x: 10, y: 20, w: 30, h: 40 },
    plumes: [], animated: { mode: 'frames', frames: { count: 4, fps: 8 } } }

  it('paints a strip of frames, each at its own phase, down one canvas, a frame as it is first laid', () => {
    const phases: number[] = []
    const made: (LayerCanvas & { calls: unknown[][] })[] = []
    const cache = new LayerCache({ factory: (w, h) => { const c = argsCanvas(w, h); made.push(c); return c }, now: () => 0,
      painters: () => ({ form: (_ctx, _desc, env) => { phases.push(env.phase) } }) })
    cache.update(smoke, 2)
    // The main thread paints the frame shown, then the others as the loop first lays them (once each).
    expect(phases).toEqual([0])
    expect([made[0].width, made[0].height]).toEqual([60, 320])
    for (const phase of [0.3, 0.31, 0.4, 0.13, 0.5]) cache.ensureFrame(smoke, phase)
    expect(phases).toEqual([0, 0.25, 0.375, 0.125])
    // A new key starts the strip again from the frame shown.
    cache.update({ ...smoke, key: 'k2' }, 2, 0.3)
    expect(phases.at(-1)).toBe(0.25)
    // A change of frames is a change of what the canvas holds.
    expect(cache.update({ ...smoke, animated: { mode: 'frames', frames: { count: 6, fps: 8 } } }, 2)).toBe('form')
  })

  it('lays the frame at the phase, and moves a falling tile as a pattern over its areas', () => {
    const visible = argsCanvas(100, 100)
    const surface = new Surface(visible, { factory: argsCanvas, now: () => 0, painters: () => ({ form: () => {} }) })
    surface.resize(50, 50, 2)
    surface.render([smoke], 0.3)
    const blit = visible.calls.filter((c) => c[0] === 'drawImage')
    // Frame 2 (0.3 s × 8 fps) of 4: the source rect starts two frames down.
    expect(blit.at(-1)!.slice(2)).toEqual([0, 160, 60, 80, 20, 40, 60, 80])
    const fall: LayerOf<'fall'> = { kind: 'fall', id: 'fall.land', surface: 'land', z: 60, key: 'f', precip: 'rain', marks: [], rgb: [1, 1, 1],
      slant: 0, bounds: { x: 0, y: 0, w: 16, h: 24 },
      animated: { mode: 'fall', fall: { vx: 0, vy: 40, areas: [[[0, 0], [20, 0], [20, 30], [0, 30]]], alphas: [0.5] } } }
    visible.calls.length = 0
    surface.render([fall], 0.25)
    const names = visible.calls.map((c) => c[0])
    expect(names).toContain('createPattern')
    expect(names.filter((n) => n === 'fill').length).toBe(1)
    // The pattern stands 10 px down (40 px/s × 0.25 s), in device px.
    expect(visible.calls.find((c) => c[0] === 'setTransform' && c[6] === 20)).toBeTruthy()
    expect(visible.calls.some((c) => c[0] === 'globalAlpha=' && c[1] === 0.5)).toBe(true)
  })
})

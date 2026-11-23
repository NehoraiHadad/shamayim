import { describe, expect, it, vi } from 'vitest'
import { EMPTY_VEGETATION } from '../model/vegDescriptor'
import type { LayerOf } from '../model/types'
import { HAND } from '../paint'
import type { PaintReply, PaintRequest } from './paintJob'
import { makeWorkerRunner, type WorkerCanvas } from './paintWorkerRun'
import { RemoteCache, type WorkerLike } from './remoteCache'
import { STRIP_CHUNK_FRAMES } from './remoteQueue'

function plane(key: string, lightKey: string, id = 'plane.near'): LayerOf<'plane'> {
  return {
    kind: 'plane', plane: 'near', id, surface: 'land', z: 30, key, bounds: { x: 0, y: 40, w: 375, h: 88 },
    outline: [[0, 50], [375, 60], [375, 128], [0, 128]], fill: [0.4, 0.4, 0.4],
    surfaceTone: { palette: [[0.4, 0.4, 0.4]], cols: 1, rows: 1, cells: [0], source: 'test' },
    gullies: [], terraces: [], vegetation: EMPTY_VEGETATION, grain: { amount: 0, seed: 1 },
    light: { key: lightKey, blend: 'source-over', litField: { cols: 1, rows: 1, grid: new Uint8Array([0, 0, 255, 0]),
      eSun: [0, 0, 0], eMoon: [0, 0, 0], eSky: [1, 1, 1], hazeLin: [0, 0, 0], yHorizon: 1 } },
  }
}

function canopy(key: string, lightKey: string, id = 'canopy.near', count = 10): LayerOf<'canopy'> {
  return {
    kind: 'canopy', id, surface: 'land', z: 30.1, key, bounds: { x: 0, y: 40, w: 375, h: 88 },
    outline: [[0, 50], [375, 60], [375, 128], [0, 128]], clear: [], wind: { lean: -0.5, gust: -0.25 },
    vegetation: { seed: 1, tones: [], trees: new Float32Array(), treeMeta: new Uint8Array(), tufts: new Float32Array(), tuftMeta: new Uint8Array() },
    animated: { mode: 'frames', frames: { count, fps: 5 } },
    light: { key: lightKey, blend: 'source-over' },
  }
}

const bitmap = (w: number, h: number) => ({ width: w, height: h, close: vi.fn() }) as unknown as ImageBitmap

function fakeWorker() {
  const sent: PaintRequest[] = []
  const worker: WorkerLike & { sent: PaintRequest[]; answer(): void } = {
    sent,
    postMessage: (message) => { sent.push(message) },
    onmessage: null,
    onerror: null,
    terminate() {},
    answer() {
      const request = sent.shift()!
      const reply: PaintReply = {
        batch: request.batch,
        results: request.jobs.map((job) => {
          const image = () => job.final === false && !job.preview ? null : bitmap(job.rect.w, job.rect.h)
          return { id: job.id, part: job.part, key: job.key, formKey: job.formKey, ratio: job.ratio, rect: job.rect, ms: 2,
            preview: job.preview, bitmap: image(), shade: job.shade ? image() : undefined }
        }),
      }
      worker.onmessage?.({ data: reply } as MessageEvent<PaintReply>)
    },
  }
  return worker
}

const painters = () => ({ form: () => {}, light: () => {} })

describe('bounded strip scheduling in RemoteCache', () => {
  it('swaps whole pairs through a light change and retires each pair together', () => {
    const worker = fakeWorker()
    const arrivals: boolean[] = []
    const cache = new RemoteCache({ worker, painters: () => ({ ...painters(), formless: () => true }),
      onArrive: ({ changed }) => arrivals.push(changed), onFail: () => {} })
    const cloudShadow = { plane: 'near', open: 1, blobs: [], from: 0, speed: 0,
      beamOverSky: 2, skyDisplay: 0.05, hazeShare: 0.1, hazeY: 0.2 } as const
    const first = { ...plane('terrain', 'old'), cloudShadow: { ...cloudShadow, blobs: [] } }
    const next = { ...first, light: { ...first.light, key: 'new' } }
    cache.update(first, 2)
    cache.flush()
    expect(worker.sent[0].jobs).toHaveLength(1)
    expect(worker.sent[0].jobs[0].shade).toBe(true)
    worker.answer()
    const held = cache.peek(first.id)!
    expect(held.shade).toBeTruthy()
    cache.update({ ...first, light: { ...first.light, key: 'superseded' } }, 2)
    cache.flush()
    cache.update(next, 2)
    worker.answer()
    // A newer complete pair is promoted even while the wanted light has moved on, so a drag keeps moving.
    expect(arrivals.at(-1)).toBe(true)
    const between = cache.peek(first.id)!
    expect(between.light).not.toBe(held.light)
    expect(between.shade).not.toBe(held.shade)
    expect(held.shade!.close).toHaveBeenCalledOnce()
    expect(held.light!.close).toHaveBeenCalledOnce()
    cache.flush()
    worker.answer()
    const swapped = cache.peek(first.id)!
    expect(swapped.light).not.toBe(between.light)
    expect(swapped.shade).not.toBe(between.shade)
    expect(cache.fresh(next, 2)).toBe(true)

    const clear = { ...next, cloudShadow: undefined }
    expect(cache.update(clear, 2)).toBe('none')
    cache.flush()
    expect(worker.sent).toHaveLength(0)
    expect(cache.peek(clear.id)).toMatchObject({ light: swapped.light, lightDesc: clear })
    expect(cache.peek(clear.id)?.shade).toBeUndefined()
    expect(swapped.shade!.close).toHaveBeenCalledOnce()
    expect(swapped.light!.close).not.toHaveBeenCalled()
  })

  it('preempts an in-flight animated strip after one bounded chunk when new terrain and scrub-light jobs arrive', async () => {
    const worker = fakeWorker()
    const arrivals: { settled: boolean; workerMs: number }[] = []
    const cache = new RemoteCache({ worker, painters, now: () => 0, onArrive: (a) => arrivals.push({ settled: a.settled, workerMs: a.workerMs }), onFail: () => {} })
    // Prime far plane so the later update is a light-only scrub.
    cache.update(plane('f1', 'fl1', 'plane.far'), 2)
    cache.flush()
    worker.answer()
    arrivals.length = 0

    // Start a 10-frame animated canopy strip (form + light = 20 poses total).
    cache.update(canopy('c1', 'cl1'), 2)
    cache.flush()
    expect(worker.sent).toHaveLength(1)
    expect(worker.sent[0].jobs).toHaveLength(1)
    expect(worker.sent[0].jobs[0].frames).toEqual([0, 1].slice(0, STRIP_CHUNK_FRAMES))
    expect(worker.sent[0].jobs[0].final).toBe(false)

    // While chunk [0, 1] is in flight, submit BOTH a new terrain refinement (plane.near) and a scrub-light change (plane.far).
    cache.update(plane('n2', 'nl2', 'plane.near'), 2)
    cache.update(plane('f1', 'fl2', 'plane.far'), 2)
    cache.flush()
    expect(worker.sent).toHaveLength(1)

    // Finishing the single 2-frame chunk emits no premature composite and immediately dispatches terrain + scrub light next.
    worker.answer()
    expect(arrivals).toEqual([])
    expect(worker.sent).toHaveLength(1)
    expect(worker.sent[0].jobs.map((j) => `${j.id}:${j.part}:${j.key}`)).toEqual([
      'plane.near:form:n2@2:0,40,375,88',
      'plane.near:light:nl2',
      'plane.far:light:fl2',
    ])

    // Terrain and scrub light become fresh immediately while the canopy strip resumes from frame 2.
    worker.answer()
    expect(cache.fresh(plane('n2', 'nl2', 'plane.near'), 2)).toBe(true)
    expect(cache.fresh(plane('f1', 'fl2', 'plane.far'), 2)).toBe(true)
    expect(arrivals).toHaveLength(1)
    expect(worker.sent[0].jobs[0]).toMatchObject({ id: 'canopy.near', part: 'form', frames: [2, 3], final: false })

    const settled = cache.whenSettled()
    while (worker.sent.length) worker.answer()
    await settled
    expect(cache.fresh(canopy('c1', 'cl1'), 2)).toBe(true)
    expect(arrivals.at(-1)?.settled).toBe(true)
  })

  it('preserves form chunk progress on light-only scrubs and cancels obsolete strip keys immediately', () => {
    const worker = fakeWorker()
    const cache = new RemoteCache({ worker, painters, now: () => 0, onArrive: () => {}, onFail: () => {} })
    cache.update(canopy('c1', 'cl1'), 2)
    cache.flush()
    expect(worker.sent[0].jobs[0]).toMatchObject({ id: 'canopy.near', part: 'form', frames: [0, 1], final: false })

    // A light-only scrub keeps form c1 advancing from frame 2 instead of restarting at frame 0.
    cache.update(canopy('c1', 'cl2'), 2)
    worker.answer()
    expect(worker.sent[0].jobs[0]).toMatchObject({ id: 'canopy.near', part: 'form', frames: [2, 3], final: false })

    // A newer form key (c2) cancels the remaining c1 frames (4..9) and starts c2 cleanly at [0, 1].
    cache.update(canopy('c2', 'cl2'), 2)
    worker.answer()
    expect(worker.sent[0].jobs[0]).toMatchObject({ id: 'canopy.near', part: 'form', key: 'c2@2:0,40,375,88#10/5', frames: [0, 1], final: false })
    expect(worker.sent[0].discard).toEqual(['canopy.near:form'])
  })

  it('shows canopy pose zero during a scrub and fills only the surviving strip after it settles', async () => {
    vi.useFakeTimers()
    try {
      const worker = fakeWorker()
      const cache = new RemoteCache({ worker, painters: () => ({ ...painters(), formless: () => true }),
        onArrive: () => {}, onFail: () => {} })
      const first = canopy('c1', 'cl1'), next = canopy('c1', 'cl2')
      cache.update(first, 2)
      cache.flush()
      expect(worker.sent[0].jobs[0]).toMatchObject({ key: 'cl1#10/5', frames: [0], preview: true })
      worker.answer()
      expect(cache.peek(first.id)).toMatchObject({ preview: true, lightKey: 'cl1#10/5' })
      expect(worker.sent).toHaveLength(0)

      vi.advanceTimersByTime(50)
      cache.update(next, 2)
      cache.flush()
      worker.answer()
      vi.advanceTimersByTime(50)
      expect(worker.sent).toHaveLength(0)
      expect(cache.peek(next.id)).toMatchObject({ preview: true, lightKey: 'cl2#10/5' })

      const settled = cache.whenSettled()
      vi.advanceTimersByTime(30)
      expect(worker.sent[0].jobs[0]).toMatchObject({ key: 'cl2#10/5', frames: [1, 2] })
      while (worker.sent.length) worker.answer()
      await settled
      expect(cache.peek(next.id)?.preview).toBeUndefined()
      expect(cache.fresh(next, 2)).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('paints all strip frames across chunks in makeWorkerRunner and transfers only on the final chunk', () => {
    const paintedPhases: number[] = []
    let clears = 0, transfers = 0
    const runner = makeWorkerRunner({
      createCanvas: (width, height): WorkerCanvas => ({
        width,
        height,
        getContext: () => new Proxy({}, {
          get: (_t, prop) => (...args: unknown[]) => { if (prop === 'clearRect' && args[0] === 0 && args[1] === 0 && args[2] === width && args[3] === height) clears++ },
          set: () => true,
        }),
        transferToImageBitmap: () => { transfers++; return { width, height, close() {} } as unknown as ImageBitmap },
      }),
      painterOf: () => ({ form: (_ctx, _desc, env) => { paintedPhases.push(env.phase) } }),
      now: () => 10,
    })
    const desc = canopy('c1', 'cl1', 'canopy.near', 6)
    const baseJob = { id: desc.id, part: 'form' as const, key: 'k', formKey: 'k', desc, ratio: 1, rect: { x: 0, y: 40, w: 375, h: 88 }, phase: 0, hand: HAND }
    const r1 = runner([{ ...baseJob, frames: [0, 1], final: false }])
    const r2 = runner([{ ...baseJob, frames: [2, 3], final: false }])
    const r3 = runner([{ ...baseJob, frames: [4, 5], final: true }])
    expect([r1[0].bitmap, r2[0].bitmap]).toEqual([null, null])
    expect(r3[0].bitmap).not.toBeNull()
    expect(clears).toBe(1)
    expect(transfers).toBe(1)
    expect(paintedPhases).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
  })
})

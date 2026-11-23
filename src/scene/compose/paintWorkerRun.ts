import type { Ctx2D, Painter, Scratch } from '../paint'
import { canvasSize, paintPart, type PaintJob, type PaintResult } from './paintJob'

/** Minimal `OffscreenCanvas` surface needed by the worker batch runner (and Node unit tests). */
export interface WorkerCanvas {
  width: number
  height: number
  getContext(id: '2d'): unknown
  transferToImageBitmap(): ImageBitmap
}

export interface WorkerRunnerDeps {
  createCanvas: (w: number, h: number) => WorkerCanvas
  painterOf: (desc: PaintJob['desc']) => Painter | undefined
  now?: () => number
}

/**
 * Per-worker batch runner: reuses one staging canvas per layer part across chunked strip batches (`job.frames`,
 * `job.final === false`) and transfers one complete `ImageBitmap` only on the completing chunk (`job.final !== false`).
 */
export function makeWorkerRunner({ createCanvas, painterOf, now = () => performance.now() }: WorkerRunnerDeps) {
  const canvases = new Map<string, WorkerCanvas>()

  function canvasFor(job: PaintJob): WorkerCanvas {
    const name = `${job.id}:${job.part}`
    let canvas = canvases.get(name)
    const { w, h } = canvasSize(job.desc, job.rect)
    if (!canvas || canvas.width !== w || canvas.height !== h) {
      canvas = createCanvas(w, h)
      canvases.set(name, canvas)
    }
    return canvas
  }

  return function runBatch(jobs: readonly PaintJob[]): PaintResult[] {
    const results: PaintResult[] = []
    try {
      for (const job of jobs) {
        const start = now()
        const canvas = canvasFor(job)
        const ctx = canvas.getContext('2d') as Ctx2D
        const painter = painterOf(job.desc)
        const paint = job.part === 'form' ? painter?.form : painter?.light
        if (job.frames && job.frames[0] === 0) ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (paint) {
          paintPart(ctx, canvas, job.desc, job.ratio, job.rect, paint, job.phase, job.hand, (w, h): Scratch => {
            const scratch = createCanvas(w, h)
            return { canvas: scratch as unknown as Scratch['canvas'], ctx: scratch.getContext('2d') as Ctx2D }
          }, job.frames)
        } else if (!job.frames) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        // Only the completing batch transfers (and empties) the canvas; intermediate strip chunks retain staged frames.
        const bitmap = job.final === false ? null : canvas.transferToImageBitmap()
        results.push({ id: job.id, part: job.part, key: job.key, formKey: job.formKey, ratio: job.ratio, rect: job.rect,
          bitmap, ms: now() - start })
      }
      return results
    } catch (error) {
      for (const result of results) result.bitmap?.close()
      throw error
    }
  }
}

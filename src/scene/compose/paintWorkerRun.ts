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

  function canvasFor(job: PaintJob, endpoint = job.part as string): WorkerCanvas {
    const name = `${job.id}:${endpoint}`
    let canvas = canvases.get(name)
    const { w, h } = canvasSize(job.desc, job.rect)
    if (!canvas || canvas.width !== w || canvas.height !== h) {
      canvas = createCanvas(w, h)
      canvases.set(name, canvas)
    }
    return canvas
  }

  function snapshot(job: PaintJob, canvas: WorkerCanvas) {
    if (job.preview && job.final === false) {
      const { w, h } = job.rect
      const first = createCanvas(w, h)
      ;(first.getContext('2d') as Ctx2D).drawImage(canvas as unknown as CanvasImageSource, 0, 0, w, h, 0, 0, w, h)
      return first.transferToImageBitmap()
    }
    return job.final === false ? null : canvas.transferToImageBitmap()
  }

  return function runBatch(jobs: readonly PaintJob[]): PaintResult[] {
    const results: PaintResult[] = []
    try {
      for (const job of jobs) {
        const start = now()
        const canvas = canvasFor(job)
        const ctx = canvas.getContext('2d') as Ctx2D
        const shade = job.shade && canvasFor(job, 'shade')
        const shadeCtx = shade ? shade.getContext('2d') as Ctx2D : undefined
        const painter = painterOf(job.desc)
        const paint = job.part === 'form' ? painter?.form : painter?.light
        if (job.frames?.[0] === 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          shadeCtx?.clearRect(0, 0, canvas.width, canvas.height)
        }
        if (paint) {
          paintPart(ctx, canvas, job.desc, job.ratio, job.rect, paint, job.phase, job.hand, (w, h): Scratch => {
            const scratch = createCanvas(w, h)
            return { canvas: scratch as unknown as Scratch['canvas'], ctx: scratch.getContext('2d') as Ctx2D }
          }, job.frames, shadeCtx)
        } else if (!job.frames) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        const bitmap = snapshot(job, canvas)
        results.push({ id: job.id, part: job.part, key: job.key, formKey: job.formKey, ratio: job.ratio, rect: job.rect,
          bitmap, preview: job.preview, ms: now() - start })
        const result = results[results.length - 1]
        if (shade) {
          result.shade = snapshot(job, shade)
          result.ms = now() - start
        }
      }
      return results
    } catch (error) {
      for (const result of results) { result.bitmap?.close(); result.shade?.close() }
      throw error
    }
  }
}

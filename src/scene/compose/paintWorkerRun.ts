import type { Ctx2D, Painter, Scratch } from '../paint'
import { frameCount } from '../model/anim'
import { canvasSize, paintPart, resultBitmaps, type PaintJob, type PaintPose, type PaintResult } from './paintJob'

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

  function canvasFor(job: PaintJob, endpoint = job.part as string, pose?: number): WorkerCanvas {
    const name = `${job.id}:${endpoint}:${pose ?? ''}`
    let canvas = canvases.get(name)
    const { w, h } = pose === undefined ? canvasSize(job.desc, job.rect) : job.rect
    if (!canvas || canvas.width !== w || canvas.height !== h) {
      canvas = createCanvas(w, h)
      canvases.set(name, canvas)
    }
    return canvas
  }

  function scratch(w: number, h: number): Scratch {
    const canvas = createCanvas(w, h)
    return { canvas: canvas as unknown as Scratch['canvas'], ctx: canvas.getContext('2d') as Ctx2D }
  }

  function paintCanopyPoses(job: PaintJob, paint: Painter['form']) {
    // Software raster can read the full strip for a small crop. Keep each pair directly drawable.
    for (const pose of job.frames!) {
      const canvas = canvasFor(job, 'light', pose), shade = canvasFor(job, 'shade', pose)
      paintPart(canvas.getContext('2d') as Ctx2D, canvas, job.desc, job.ratio, job.rect,
        paint, job.phase, job.hand, scratch, undefined, shade.getContext('2d') as Ctx2D, pose)
    }
    const first = { bitmap: snapshot(job, canvasFor(job, 'light', 0)), shade: snapshot(job, canvasFor(job, 'shade', 0)) }
    if (job.final === false) return first
    const poses: PaintPose[] = []
    for (let i = 1; i < frameCount(job.desc.animated); i++) {
      poses.push({ bitmap: canvasFor(job, 'light', i).transferToImageBitmap(), shade: canvasFor(job, 'shade', i).transferToImageBitmap() })
    }
    return { ...first, poses }
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
        const painter = painterOf(job.desc)
        const paint = job.part === 'form' ? painter?.form : painter?.light
        const info = { id: job.id, part: job.part, key: job.key, formKey: job.formKey, ratio: job.ratio, rect: job.rect, preview: job.preview }
        if (paint && job.shade && job.progressive && job.frames) {
          const endpoints = paintCanopyPoses(job, paint)
          results.push({ ...info, ...endpoints, ms: now() - start })
          continue
        }
        const canvas = canvasFor(job)
        const ctx = canvas.getContext('2d') as Ctx2D
        const shade = job.shade && canvasFor(job, 'shade')
        const shadeCtx = shade ? shade.getContext('2d') as Ctx2D : undefined
        if (job.frames?.[0] === 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          shadeCtx?.clearRect(0, 0, canvas.width, canvas.height)
        }
        if (paint) {
          paintPart(ctx, canvas, job.desc, job.ratio, job.rect, paint, job.phase, job.hand, scratch, job.frames, shadeCtx)
        } else if (!job.frames) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        const bitmap = snapshot(job, canvas)
        const shadeBitmap = shade ? snapshot(job, shade) : undefined
        results.push({ ...info, bitmap, shade: shadeBitmap, ms: now() - start })
      }
      return results
    } catch (error) {
      for (const result of results) for (const bitmap of resultBitmaps(result)) bitmap?.close()
      throw error
    }
  }
}

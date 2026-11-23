import type { Ctx2D, Painter, Scratch } from '../paint'
import { frameCount } from '../model/anim'
import { canvasSize, paintPart, paintSlot, type PaintJob, type PaintPose, type PaintResult } from './paintJob'

/** Minimal `OffscreenCanvas` surface needed by the worker batch runner (and Node unit tests). */
export interface WorkerCanvas {
  width: number
  height: number
  getContext(id: '2d'): unknown
  transferToImageBitmap(): ImageBitmap
}

export interface WorkerRunnerDeps {
  createCanvas: (w: number, h: number) => WorkerCanvas
  painterOf: (desc: PaintJob['desc'], style: PaintJob['style']) => Painter | undefined
  now?: () => number
}

/**
 * Per-worker batch runner. Retains staging canvases only between chunks of unfinished strips.
 */
export function makeWorkerRunner({ createCanvas, painterOf, now = () => performance.now() }: WorkerRunnerDeps) {
  const staged = new Map<string, Map<string, WorkerCanvas>>()

  function canvasFor(canvases: Map<string, WorkerCanvas>, job: PaintJob, endpoint = job.part as string, pose?: number): WorkerCanvas {
    const name = `${endpoint}:${pose ?? ''}`
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

  function paintCanopyPoses(canvases: Map<string, WorkerCanvas>, job: PaintJob, paint: Painter['form'],
    transfer: (canvas: WorkerCanvas) => ImageBitmap) {
    // Software raster can read the full strip for a small crop. Keep each pair directly drawable.
    for (const pose of job.frames!) {
      const canvas = canvasFor(canvases, job, 'light', pose), shade = canvasFor(canvases, job, 'shade', pose)
      paintPart(canvas.getContext('2d') as Ctx2D, canvas, job.desc, job.ratio, job.rect,
        paint, job.phase, job.hand, scratch, undefined, job.style, shade.getContext('2d') as Ctx2D, pose)
    }
    const first = { bitmap: snapshot(job, canvasFor(canvases, job, 'light', 0), transfer),
      shade: snapshot(job, canvasFor(canvases, job, 'shade', 0), transfer) }
    if (job.final === false) return first
    const poses: PaintPose[] = []
    for (let i = 1; i < frameCount(job.desc.animated); i++) {
      poses.push({ bitmap: transfer(canvasFor(canvases, job, 'light', i)), shade: transfer(canvasFor(canvases, job, 'shade', i)) })
    }
    return { ...first, poses }
  }

  function snapshot(job: PaintJob, canvas: WorkerCanvas, transfer: (canvas: WorkerCanvas) => ImageBitmap) {
    if (job.preview && job.final === false) {
      const { w, h } = job.rect
      const first = createCanvas(w, h)
      ;(first.getContext('2d') as Ctx2D).drawImage(canvas as unknown as CanvasImageSource, 0, 0, w, h, 0, 0, w, h)
      return transfer(first)
    }
    return job.final === false ? null : transfer(canvas)
  }

  return function runBatch(jobs: readonly PaintJob[], discard: readonly string[] = []): PaintResult[] {
    for (const slot of discard) staged.delete(slot)
    const results: PaintResult[] = []
    const bitmaps: ImageBitmap[] = []
    const transfer = (canvas: WorkerCanvas) => {
      const bitmap = canvas.transferToImageBitmap()
      bitmaps.push(bitmap)
      return bitmap
    }
    try {
      for (const job of jobs) {
        const start = now()
        const painter = painterOf(job.desc, job.style)
        const paint = job.part === 'form' ? painter?.form : painter?.light
        const info = { id: job.id, part: job.part, key: job.key, formKey: job.formKey, ratio: job.ratio, rect: job.rect, preview: job.preview }
        const slot = paintSlot(job.id, job.part)
        const previous = job.frames?.[0] ? staged.get(slot) : undefined
        const canvases = previous ?? new Map<string, WorkerCanvas>()
        if (job.final === false) staged.set(slot, canvases)
        else staged.delete(slot)
        if (paint && job.shade && job.progressive && job.frames) {
          const endpoints = paintCanopyPoses(canvases, job, paint, transfer)
          results.push({ ...info, ...endpoints, ms: now() - start })
          continue
        }
        const canvas = canvasFor(canvases, job)
        const ctx = canvas.getContext('2d') as Ctx2D
        const shade = job.shade && canvasFor(canvases, job, 'shade')
        const shadeCtx = shade ? shade.getContext('2d') as Ctx2D : undefined
        if (job.frames?.[0] === 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          shadeCtx?.clearRect(0, 0, canvas.width, canvas.height)
        }
        if (paint) {
          paintPart(ctx, canvas, job.desc, job.ratio, job.rect, paint, job.phase, job.hand, scratch, job.frames, job.style, shadeCtx)
        } else if (!job.frames) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        const bitmap = snapshot(job, canvas, transfer)
        const shadeBitmap = shade ? snapshot(job, shade, transfer) : undefined
        results.push({ ...info, bitmap, shade: shadeBitmap, ms: now() - start })
      }
      return results
    } catch (error) {
      staged.clear()
      for (const bitmap of bitmaps) bitmap.close()
      throw error
    }
  }
}

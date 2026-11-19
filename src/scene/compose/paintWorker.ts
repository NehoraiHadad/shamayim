import { painterOf } from '../paint'
import { paintPart, type PaintJob, type PaintReply, type PaintRequest, type PaintResult } from './paintJob'

/**
 * The paint worker (§1d, off the main thread): paints the parts of layers it is sent on its own `OffscreenCanvas`es with
 * the same painters and the same `paintPart` as the main thread's cache, and hands each back as an `ImageBitmap`
 * (transferred, not copied). The main thread only lays the bitmaps into the visible canvas, so neither a cold start nor
 * a scrub frame rasterizes a layer there. One reply per request, in order.
 */
interface WorkerScope {
  onmessage: ((event: MessageEvent<PaintRequest>) => void) | null
  postMessage(message: PaintReply, transfer: Transferable[]): void
}
const scope = globalThis as unknown as WorkerScope

/** One canvas per layer part, reused (a transfer leaves it blank, its size kept). */
const canvases = new Map<string, OffscreenCanvas>()

function canvasFor(job: PaintJob): OffscreenCanvas {
  const name = `${job.id}:${job.part}`
  let canvas = canvases.get(name)
  if (!canvas || canvas.width !== job.rect.w || canvas.height !== job.rect.h) {
    canvas = new OffscreenCanvas(job.rect.w, job.rect.h)
    canvases.set(name, canvas)
  }
  return canvas
}

const ctxOf = (canvas: OffscreenCanvas) => canvas.getContext('2d') as OffscreenCanvasRenderingContext2D

scope.onmessage = (event) => {
  const { batch, jobs } = event.data
  const results: PaintResult[] = []
  try {
    for (const job of jobs) {
      const start = performance.now()
      const canvas = canvasFor(job)
      const painter = painterOf(job.desc)
      const paint = job.part === 'form' ? painter?.form : painter?.light
      if (paint) {
        paintPart(ctxOf(canvas), canvas, job.desc, job.ratio, job.rect, paint, job.phase, job.hand, (w, h) => {
          const scratch = new OffscreenCanvas(w, h)
          return { canvas: scratch, ctx: ctxOf(scratch) }
        })
      } else ctxOf(canvas).clearRect(0, 0, canvas.width, canvas.height)
      // The transfer is where the canvas rasterizes what was drawn (a 2D canvas defers its raster to its first read).
      const bitmap = canvas.transferToImageBitmap()
      results.push({ id: job.id, part: job.part, key: job.key, formKey: job.formKey, ratio: job.ratio, rect: job.rect, bitmap,
        ms: performance.now() - start })
    }
    scope.postMessage({ batch, results }, results.map((result) => result.bitmap))
  } catch (error) {
    for (const result of results) result.bitmap.close()
    scope.postMessage({ batch, results: [], error: String(error) }, [])
  }
}

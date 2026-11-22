import { painterOf } from '../paint'
import type { PaintReply, PaintRequest } from './paintJob'
import { makeWorkerRunner } from './paintWorkerRun'

/**
 * The paint worker (§1d, off the main thread): paints layer parts on its own `OffscreenCanvas`es via `makeWorkerRunner`
 * and hands completed parts back as transferred `ImageBitmap`s. Multi-frame strips paint in bounded pose chunks across
 * batches so newly arriving terrain or scrub-light jobs can preempt between chunks. One reply per request, in order.
 */
interface WorkerScope {
  onmessage: ((event: MessageEvent<PaintRequest>) => void) | null
  postMessage(message: PaintReply, transfer: Transferable[]): void
}
const scope = globalThis as unknown as WorkerScope

const runBatch = makeWorkerRunner({
  createCanvas: (w, h) => new OffscreenCanvas(w, h),
  painterOf,
})

scope.onmessage = (event) => {
  const { batch, jobs } = event.data
  try {
    const results = runBatch(jobs)
    const transfer = results.flatMap((result) => (result.bitmap ? [result.bitmap] : []))
    scope.postMessage({ batch, results }, transfer)
  } catch (error) {
    scope.postMessage({ batch, results: [], error: String(error) }, [])
  }
}

import type { WorkerLike } from './remoteCache'

/**
 * The paint worker (`paintWorker.ts`) where the browser can paint in one: a module worker with a 2D `OffscreenCanvas`
 * that hands back `ImageBitmap`s. Null elsewhere (the surface then paints on the main thread, as before); a browser that
 * has the classes but no 2D context in workers fails its first batch, and the surface goes back to painting itself.
 */
export function paintWorker(): WorkerLike | null {
  return spares.pop() ?? spawn()
}

function spawn(): WorkerLike | null {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined'
    || typeof OffscreenCanvas.prototype.transferToImageBitmap !== 'function') return null
  try {
    return new Worker(new URL('./paintWorker.ts', import.meta.url), { type: 'module', name: 'scene-paint' }) as unknown as WorkerLike
  } catch {
    return null
  }
}

/** Workers started ahead of their surfaces (`warmPaintWorkers`), so their script loads while the world is built. */
const spares: WorkerLike[] = []

/** Starts `count` paint workers now, for the surfaces about to be made (the sky's, the land's, the wear card's). */
export function warmPaintWorkers(count: number) {
  while (spares.length < count) {
    const worker = spawn()
    if (!worker) return
    spares.push(worker)
  }
}

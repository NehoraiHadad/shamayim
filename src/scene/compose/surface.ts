import type { LayerDesc } from '../model/types'
import { ctxOf, LayerCache, type CacheOptions, type LayerCanvas, type Painted } from './layerCache'
import { RemoteCache, type Arrival, type WorkerLike } from './remoteCache'

export interface SurfaceOptions extends CacheOptions {
  /**
   * A paint worker, where the browser can paint in one (`paintWorker()`): the layers are painted there and handed back as
   * bitmaps, the main thread only lays them. Without one (or if it fails) the surface paints its layers itself.
   */
  worker?: () => WorkerLike | null
  /** A batch of the worker's came in and was laid (`ms`: the main thread's time for it, the composite included). */
  onArrive?: (arrival: Arrival & { ms: number }) => void
}

/**
 * A visible canvas (§1d: the SkySurface in the sky, the LandSurface in the scene figure) and the stack of cached layer
 * canvases composited into it by `drawImage`, in `z` order. The visible canvas is sized to its CSS box × `dpr`.
 */
export class Surface {
  /** The surface's own cache: it paints on the main thread (no worker, or the worker failed). */
  readonly cache: LayerCache
  /** The worker's cache, while there is a worker. */
  remote: RemoteCache | null = null
  private width = 0
  private height = 0
  private last: readonly LayerDesc[] = []
  private readonly now: () => number
  private readonly onArrive?: SurfaceOptions['onArrive']
  dpr = 1

  readonly canvas: LayerCanvas

  constructor(canvas: LayerCanvas, options: SurfaceOptions = {}) {
    this.canvas = canvas
    this.cache = new LayerCache(options)
    this.now = options.now ?? (() => performance.now())
    this.onArrive = options.onArrive
    const worker = options.worker?.()
    if (worker) {
      this.remote = new RemoteCache({ worker, painters: options.painters, hand: options.hand, now: this.now,
        onArrive: (arrival) => {
          const start = this.now()
          this.composite(this.last)
          this.onArrive?.({ ...arrival, ms: this.now() - start })
        },
        onFail: () => {
          // Back to painting here: what the worker had not delivered is painted now.
          this.remote = null
          this.render(this.last)
        } })
    }
  }

  private get active(): LayerCache | RemoteCache {
    return this.remote ?? this.cache
  }

  /** Sizes the visible canvas (CSS px × dpr); a no-op when nothing changed. */
  resize(width: number, height: number, dpr: number) {
    const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr))
    this.width = width
    this.height = height
    this.dpr = dpr
    if (this.canvas.width !== w) this.canvas.width = w
    if (this.canvas.height !== h) this.canvas.height = h
  }

  fresh(desc: LayerDesc) {
    return this.active.fresh(desc, this.dpr)
  }

  /** Brings a layer up to date: painted here, or asked of the worker (sent by `flush`, or by `render`). */
  paint(desc: LayerDesc, phase = 0): Painted {
    return this.active.update(desc, this.dpr, phase)
  }

  /** Sends what was asked of the worker (a no-op without one). */
  flush() {
    this.remote?.flush()
  }

  /** Whether a layer has anything to show yet. */
  peek(id: string) {
    return this.active.peek(id)
  }

  prune(keep: ReadonlySet<string>) {
    this.active.prune(keep)
  }

  /** Resolves once the worker has delivered everything asked of it (at once without a worker). */
  settled(): Promise<void> {
    return this.remote?.whenSettled() ?? Promise.resolve()
  }

  /** Lays the layers' cached canvases into the visible one, in order; a layer never painted yet is left out. */
  composite(layers: readonly LayerDesc[]) {
    this.last = layers
    const ctx = ctxOf(this.canvas)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const d = this.dpr
    const cache = this.active
    for (const desc of [...layers].sort((a, b) => a.z - b.z)) {
      const cached = cache.peek(desc.id)
      if (!cached) continue
      const { form, light, ratio, rect } = cached
      // At the device's ratio a whole-pixel blit (the fast path); a stale canvas of another ratio is scaled until
      // it is repainted.
      const k = d / ratio
      const draw = (image: CanvasImageSource | OffscreenCanvas) => k === 1 ? ctx.drawImage(image as CanvasImageSource, rect.x, rect.y)
        : ctx.drawImage(image as CanvasImageSource, rect.x * k, rect.y * k, rect.w * k, rect.h * k)
      if (form && !cache.formless(desc)) draw(form)
      if (light && desc.light) {
        ctx.globalCompositeOperation = desc.light.blend
        draw(light)
        ctx.globalCompositeOperation = 'source-over'
      }
    }
  }

  /** Paints (or asks for) what is stale and composites: one synchronous frame (a scrub, a resize). */
  render(layers: readonly LayerDesc[], phase = 0): Painted[] {
    this.last = layers
    this.prune(new Set(layers.map((layer) => layer.id)))
    const painted = layers.map((desc) => this.paint(desc, phase))
    this.flush()
    this.composite(layers)
    return painted
  }

  /** Backing memory: the visible canvas and the cached layers (bytes). */
  bytes() {
    return this.canvas.width * this.canvas.height * 4 + this.active.bytes()
  }

  get size() {
    return { width: this.width, height: this.height }
  }
}

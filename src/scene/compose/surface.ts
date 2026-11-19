import { driftAt, fallAt, flashAt, frameAt } from '../model/anim'
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
  /** The animation phase the canvas was last laid at (an arriving batch is laid at it). */
  private phase = 0
  private readonly now: () => number
  private readonly onArrive?: SurfaceOptions['onArrive']
  dpr = 1
  /** What the visible canvas last showed: the layers and their animation state (an unchanged frame is not recomposited). */
  private shown: { layers: readonly LayerDesc[]; anim: string } | null = null

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
    if (this.canvas.width !== w) { this.canvas.width = w; this.shown = null }
    if (this.canvas.height !== h) { this.canvas.height = h; this.shown = null }
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

  /**
   * Lays the layers' cached canvases into the visible one, in order; a layer never painted yet is left out. An animated
   * layer (`desc.animated`, C6) is laid where its drift has carried it at `phase`, in whole device px, repeated every
   * `period` across the surface, and with its flash schedule's alpha (`model/anim.ts`): nothing is repainted for it.
   */
  composite(layers: readonly LayerDesc[], phase = this.phase) {
    this.last = layers
    this.phase = phase
    this.shown = { layers, anim: this.animState(layers, phase) }
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
      const anim = desc.animated
      const alpha = flashAt(anim, phase)
      if (alpha <= 0.003) continue
      ctx.globalAlpha = alpha
      const period = (anim?.mode === 'drift' || anim?.mode === 'fall') && anim.period && k === 1 ? Math.round(anim.period * d) : 0
      const shift = period ? Math.round(driftAt(anim, phase) * d) : 0
      if (anim?.mode === 'fall' && anim.fall) {
        if (k === 1 && form) this.fall(form, desc, rect, phase, period, shift, alpha)
        ctx.globalAlpha = 1
        continue
      }
      const draw = (image: CanvasImageSource | OffscreenCanvas) => {
        const source = image as CanvasImageSource
        // A strip (C7): the frame at this phase, of the frames the canvas holds.
        const held = Math.max(1, Math.round((image as { height: number }).height / rect.h))
        const sy = held > 1 ? (frameAt(anim, phase) % held) * rect.h : 0
        if (k !== 1) return ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x * k, rect.y * k, rect.w * k, rect.h * k)
        if (!period) return held > 1 ? ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h) : ctx.drawImage(source, rect.x, rect.y)
        for (let x = rect.x + shift - period * Math.ceil((rect.x + shift + rect.w) / period); x < this.canvas.width; x += period) {
          if (x + rect.w > 0) ctx.drawImage(source, 0, sy, rect.w, rect.h, x, rect.y, rect.w, rect.h)
        }
      }
      if (form && !cache.formless(desc)) draw(form)
      if (light && desc.light) {
        ctx.globalCompositeOperation = desc.light.blend
        draw(light)
        ctx.globalCompositeOperation = 'source-over'
      }
      ctx.globalAlpha = 1
    }
  }

  /**
   * Falling marks (C7): the layer's tile laid as a repeating pattern inside its areas, the pattern carried by the fall in
   * whole device px, the areas drifting with their cloud layer (copies every `period`). One pattern fill per area: nothing
   * is repainted.
   */
  private fall(tile: CanvasImageSource | OffscreenCanvas, desc: LayerDesc, rect: { w: number; h: number }, phase: number,
    period: number, shift: number, alpha: number) {
    const fall = desc.animated!.fall!
    const ctx = ctxOf(this.canvas)
    const pattern = ctx.createPattern(tile as CanvasImageSource, 'repeat')
    if (!pattern) return
    const d = this.dpr
    const off = fallAt(desc.animated, phase, { w: rect.w / d, h: rect.h / d })
    const width = this.canvas.width
    ctx.fillStyle = pattern
    fall.areas.forEach((area, i) => {
      if (area.length < 3) return
      // Each area takes the pattern at its own offset, so nested areas add marks (a density that thins to the edge), not
      // the same marks again.
      const ox = Math.round((off.x + ((i * 0.381966) % 1) * rect.w / d) * d) % rect.w
      const oy = Math.round((off.y + ((i * 0.618034) % 1) * rect.h / d) * d) % rect.h
      ctx.setTransform(1, 0, 0, 1, ox, oy)
      let left = Infinity, right = -Infinity
      for (const [x] of area) { left = Math.min(left, x * d); right = Math.max(right, x * d) }
      ctx.beginPath()
      const from = period ? shift - period * Math.ceil((right + shift) / period) : 0
      for (let cx = from; ; cx += period) {
        if (left + cx < width && right + cx > 0) {
          area.forEach(([x, y], j) => (j ? ctx.lineTo(x * d + cx - ox, y * d - oy) : ctx.moveTo(x * d + cx - ox, y * d - oy)))
          ctx.closePath()
        }
        if (!period || left + cx >= width) break
      }
      ctx.globalAlpha = alpha * (fall.alphas?.[i] ?? 1)
      ctx.fill()
    })
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  /** The animation state of the layers at `phase` (whole device px of drift, flash alpha steps, strip frames, falls). */
  private animState(layers: readonly LayerDesc[], phase: number) {
    let out = ''
    for (const layer of layers) {
      const anim = layer.animated
      if (!anim) continue
      out += `${Math.round(driftAt(anim, phase) * this.dpr)}:${Math.round(flashAt(anim, phase) * 255)}:${frameAt(anim, phase)}`
      if (anim.fall) {
        const off = fallAt(anim, phase, layer.bounds)
        out += `:${Math.round(off.x * this.dpr)},${Math.round(off.y * this.dpr)}`
      }
      out += ';'
    }
    return out
  }

  /** Paints (or asks for) what is stale and composites: one synchronous frame (a scrub, a resize, an animation tick). */
  render(layers: readonly LayerDesc[], phase = 0): Painted[] {
    this.last = layers
    this.prune(new Set(layers.map((layer) => layer.id)))
    const painted = layers.map((desc) => this.paint(desc, phase))
    this.flush()
    // An animation tick that moved nothing a whole pixel (and repainted or asked for nothing) leaves the canvas as it is.
    if (this.shown && this.shown.layers === layers && this.shown.anim === this.animState(layers, phase)
      && painted.every((p) => p === 'none')) return painted
    this.composite(layers, phase)
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

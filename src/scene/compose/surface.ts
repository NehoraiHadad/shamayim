import type { LayerDesc } from '../model/types'
import { ctxOf, LayerCache, type CacheOptions, type LayerCanvas, type Painted } from './layerCache'

/**
 * A visible canvas (§1d: the SkySurface in the sky, the LandSurface in the scene figure) and the stack of cached layer
 * canvases composited into it by `drawImage`, in `z` order. The visible canvas is sized to its CSS box × `dpr`.
 */
export class Surface {
  readonly cache: LayerCache
  private width = 0
  private height = 0
  dpr = 1

  readonly canvas: LayerCanvas

  constructor(canvas: LayerCanvas, options: CacheOptions = {}) {
    this.canvas = canvas
    this.cache = new LayerCache(options)
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
    return this.cache.fresh(desc, this.dpr)
  }

  paint(desc: LayerDesc, phase = 0): Painted {
    return this.cache.update(desc, this.dpr, phase)
  }

  /** Lays the layers' cached canvases into the visible one, in order; a layer never painted yet is left out. */
  composite(layers: readonly LayerDesc[]) {
    const ctx = ctxOf(this.canvas)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const d = this.dpr
    for (const desc of [...layers].sort((a, b) => a.z - b.z)) {
      const cached = this.cache.peek(desc.id)
      if (!cached) continue
      const { form, light, ratio, rect } = cached
      // At the device's ratio a whole-pixel blit (the fast path); a stale canvas of another ratio is scaled until
      // it is repainted.
      const k = d / ratio
      const draw = (canvas: typeof form) => k === 1 ? ctx.drawImage(canvas, rect.x, rect.y)
        : ctx.drawImage(canvas, rect.x * k, rect.y * k, rect.w * k, rect.h * k)
      if (!this.cache.formless(desc)) draw(form)
      if (light && desc.light) {
        ctx.globalCompositeOperation = desc.light.blend
        draw(light)
        ctx.globalCompositeOperation = 'source-over'
      }
    }
  }

  /** Paints what is stale and composites: one synchronous frame (a scrub, a resize). */
  render(layers: readonly LayerDesc[], phase = 0): Painted[] {
    this.cache.prune(new Set(layers.map((layer) => layer.id)))
    const painted = layers.map((desc) => this.paint(desc, phase))
    this.composite(layers)
    return painted
  }

  /** Backing memory: the visible canvas and the cached layers (bytes). */
  bytes() {
    return this.canvas.width * this.canvas.height * 4 + this.cache.bytes()
  }

  get size() {
    return { width: this.width, height: this.height }
  }
}

import { driftAt, fadeAt, fallAt, flashAt, frameAt, glideAt, revealAt, swayAt, trackAt } from '../model/anim'
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
  /** The animation phase the canvas was last laid at (an arriving batch is laid at it), and whether in reduced motion. */
  private phase = 0
  /** Reduced motion (`composite`): set by the shell, the default of every render and composite. */
  still = false
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
          this.composite(this.last, this.phase, this.still)
          this.onArrive?.({ ...arrival, ms: this.now() - start })
        },
        onFail: () => {
          // Back to painting here: what the worker had not delivered is painted now.
          this.remote = null
          this.render(this.last, this.phase, this.still)
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
   * The land's arrival (C8) is laid the same way: a layer's fade and breath in its alpha, a glide as an offset (only for a
   * canvas painted for its desc), a forming line laid within (or, unmade, outside) a window growing from the place.
   * `still` (reduced motion): the drifts, strips, falls and flashes stand at phase 0 and nothing glides or forms; the
   * fades still run with the phase (the arrival's simple fade).
   */
  composite(layers: readonly LayerDesc[], phase = this.phase, still = this.still) {
    this.last = layers
    this.phase = phase
    this.still = still
    this.shown = { layers, anim: this.animState(layers, phase, still) }
    const motion = still ? 0 : phase
    const ctx = ctxOf(this.canvas)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const d = this.dpr
    const cache = this.active
    for (const desc of [...layers].sort((a, b) => a.z - b.z)) {
      // A strip's frame is painted when it is first laid (the main thread's cache; the worker paints whole strips).
      if (cache instanceof LayerCache && desc.animated?.frames) cache.ensureFrame(desc, phase)
      const cached = cache.peek(desc.id)
      if (!cached) continue
      const { form, light, ratio, rect } = cached
      // At the device's ratio a whole-pixel blit (the fast path); a stale canvas of another ratio is scaled until
      // it is repainted.
      const k = d / ratio
      const anim = desc.animated
      const alpha = flashAt(anim, motion) * fadeAt(anim, phase, still)
      if (alpha <= 0.003) continue
      const reach = revealAt(anim, phase, this.width, still)
      if (reach < 0) continue
      // C10: a flock's sway round its place (a closed track).
      const flown = trackAt(anim?.flight, motion, still)
      if (!flown) continue
      const fx = Math.round(flown.x * d), fy = Math.round(flown.y * d)
      // The clothesline's gust (`Sway`), applied after the flight.
      const sway = swayAt(anim?.sway, motion, still)
      // The sky's life, laid where its object is at the shown minute (painted round its own origin), scaled and faded.
      const lay = desc.placed
      if (lay && alpha * lay.alpha <= 0.003) continue
      ctx.globalAlpha = lay ? alpha * lay.alpha : alpha
      if (lay?.above !== undefined) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, this.canvas.width, Math.round(lay.above * d))
        ctx.clip()
      }
      const period = (anim?.mode === 'drift' || anim?.mode === 'fall') && anim.period && k === 1 ? Math.round(anim.period * d) : 0
      const shift = period ? Math.round(driftAt(anim, motion) * d) : 0
      // A glide (C8) moves only a canvas painted for this desc: a stale one still stands where it was painted for.
      const dy = anim?.glide && k === 1 && cache.fresh(desc, d) ? Math.round(glideAt(anim, phase, still) * d) : 0
      const y = rect.y + dy
      if (anim?.mode === 'fall' && anim.fall) {
        if (k === 1 && form) this.fall(form, desc, rect, motion, period, shift, alpha)
        ctx.globalAlpha = 1
        continue
      }
      const draw = (image: CanvasImageSource | OffscreenCanvas) => {
        const source = image as CanvasImageSource
        // A strip (C7): the frame at this phase, of the frames the canvas holds.
        const held = Math.max(1, Math.round((image as { height: number }).height / rect.h))
        const sy = held > 1 ? (frameAt(anim, motion) % held) * rect.h : 0
        if (lay) {
          const sc = lay.scale * k
          // At full size on whole device px (crisp); smaller, where it truly is (a far object moves smoothly).
          const lx = sc === 1 ? Math.round(lay.x * d) + rect.x : lay.x * d + rect.x * sc
          const ly = sc === 1 ? Math.round(lay.y * d) + rect.y : lay.y * d + rect.y * sc
          // (A sway, should a laid layer have one, goes through its affine as below.)
          if (sway) ctx.setTransform(sway[0], sway[1], sway[2], sway[3], sway[4] * d, sway[5] * d)
          ctx.drawImage(source, 0, sy, rect.w, rect.h, lx + fx, ly + fy, rect.w * sc, rect.h * sc)
          if (sway) ctx.setTransform(1, 0, 0, 1, 0, 0)
          return
        }
        if (k !== 1) return ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x * k, rect.y * k, rect.w * k, rect.h * k)
        // The clothesline (`Sway`): the sprite through its gust's affine (surface px → device px), then back to identity.
        if (sway) {
          ctx.setTransform(sway[0], sway[1], sway[2], sway[3], sway[4] * d, sway[5] * d)
          ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x + fx, y + fy, rect.w, rect.h)
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          return
        }
        if (anim?.reveal && Number.isFinite(reach)) return this.window(source, rect, sy, y, anim.reveal, reach, alpha)
        if (fx || fy) return ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x + fx, y + fy, rect.w, rect.h)
        if (!period) return held > 1 || dy ? ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x, y, rect.w, rect.h) : ctx.drawImage(source, rect.x, rect.y)
        for (let x = rect.x + shift - period * Math.ceil((rect.x + shift + rect.w) / period); x < this.canvas.width; x += period) {
          if (x + rect.w > 0) ctx.drawImage(source, 0, sy, rect.w, rect.h, x, y, rect.w, rect.h)
        }
      }
      if (form && !cache.formless(desc)) draw(form)
      if (light && desc.light) {
        ctx.globalCompositeOperation = desc.light.blend
        draw(light)
        ctx.globalCompositeOperation = 'source-over'
      }
      if (lay?.above !== undefined) ctx.restore()
      ctx.globalAlpha = 1
    }
  }

  /**
   * A forming line (C8): the layer laid within `x ± reach` (surface px), feathered over `feather` px either side in a few
   * slices of falling alpha; `erase` lays the complement, so a line unmade and a line made over the same front meet.
   */
  private window(source: CanvasImageSource, rect: { x: number; y: number; w: number; h: number }, sy: number, y: number,
    reveal: NonNullable<NonNullable<LayerDesc['animated']>['reveal']>, reach: number, alpha: number) {
    const ctx = ctxOf(this.canvas)
    const d = this.dpr
    const lo = (reveal.x - reach) * d, hi = (reveal.x + reach) * d, f = reveal.feather * d
    const n = 5
    const pieces: [number, number, number][] = []
    for (let j = 0; j < n; j++) {
      const a = (j + 1) / (n + 1)
      pieces.push([lo - f + (j * f) / n, lo - f + ((j + 1) * f) / n, a], [hi + f - ((j + 1) * f) / n, hi + f - (j * f) / n, a])
    }
    if (reveal.erase) {
      for (const p of pieces) p[2] = 1 - p[2]
      pieces.push([-Infinity, lo - f, 1], [hi + f, Infinity, 1])
    } else {
      pieces.push([lo, hi, 1])
    }
    for (const [x0, x1, a] of pieces) {
      const left = Math.max(rect.x, Math.round(x0)), right = Math.min(rect.x + rect.w, Math.round(x1))
      if (right <= left || a <= 0.003) continue
      ctx.globalAlpha = alpha * a
      ctx.drawImage(source, left - rect.x, sy, right - left, rect.h, left, y, right - left, rect.h)
    }
    ctx.globalAlpha = alpha
  }

  /** Lays the last layers again at `phase` (a frame of a clip or a still, laid by a harness): nothing is repainted. */
  lay(phase: number, still = false) {
    this.composite(this.last, phase, still)
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

  /**
   * The animation state of the layers at `phase` (whole device px of drift, flash alpha steps, strip frames, falls; the
   * arrival's alpha steps, glide px and window px).
   */
  private animState(layers: readonly LayerDesc[], phase: number, still: boolean) {
    const motion = still ? 0 : phase
    let out = still ? 's' : ''
    for (const layer of layers) {
      const anim = layer.animated
      if (!anim) continue
      out += `${Math.round(driftAt(anim, motion) * this.dpr)}:${Math.round(flashAt(anim, motion) * 255)}:${frameAt(anim, motion)}`
      if (anim.fall) {
        const off = fallAt(anim, motion, layer.bounds)
        out += `:${Math.round(off.x * this.dpr)},${Math.round(off.y * this.dpr)}`
      }
      if (anim.fade || anim.breath) out += `:${Math.round(fadeAt(anim, phase, still) * 255)}`
      if (anim.glide) out += `:${Math.round(glideAt(anim, phase, still) * this.dpr)}`
      if (anim.reveal) out += `:${Math.round(Math.min(1e5, revealAt(anim, phase, this.width, still)) * this.dpr)}`
      if (anim.flight) {
        const f = trackAt(anim.flight, motion, still)
        out += f ? `:${Math.round(f.x * this.dpr)},${Math.round(f.y * this.dpr)}` : ':off'
      }
      if (anim.sway) {
        const m = swayAt(anim.sway, motion, still)!
        out += `:${m.slice(0, 4).map((v) => Math.round(v * 400)).join(',')},${Math.round(m[4] * this.dpr * 4)},${Math.round(m[5] * this.dpr * 4)}`
      }
      out += ';'
    }
    return out
  }

  /**
   * Paints (or asks for) what is stale and composites: one synchronous frame (a scrub, a resize, an animation tick).
   * `still`: reduced motion (see `composite`).
   */
  render(layers: readonly LayerDesc[], phase = 0, still = this.still): Painted[] {
    this.last = layers
    this.prune(new Set(layers.map((layer) => layer.id)))
    const painted = layers.map((desc) => this.paint(desc, phase))
    this.flush()
    // An animation tick that moved nothing a whole pixel (and repainted or asked for nothing) leaves the canvas as it is.
    if (this.shown && this.shown.layers === layers && this.shown.anim === this.animState(layers, phase, still)
      && painted.every((p) => p === 'none')) return painted
    this.composite(layers, phase, still)
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

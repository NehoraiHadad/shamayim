import { driftAt, fadeAt, fallAt, flashAt, frameAt, glideAt, revealAt, swayAt, trackAt } from '../model/anim'
import { carriedS } from '../model/advect'
import { trailTimeAt } from '../model/contrailMotion'
import { shadowSeconds } from '../model/planeCloudShadow'
import type { LayerDesc } from '../model/types'
import { paintContrail } from '../paint/contrail'
import { layCarried } from './advect'
import { ctxOf, defaultFactory, LayerCache, type CacheOptions, type LayerCanvas, type Painted } from './layerCache'
import { formKeyOf, stripKey } from './paintJob'
import { canopyMatchesPlane, shadeId, shadeLayer } from './planeComposite'
import { RemoteCache, type Arrival, type WorkerLike } from './remoteCache'
import { ShadowComposite } from './shadowComposite'
import type { SceneStats } from './stats'
import { compositeOrder } from './compositeOrder'

function layoutOf(desc: LayerDesc, cached: { formKey: string; desc: LayerDesc } | null, dpr: number) {
  return !cached || cached.desc === desc || cached.formKey === formKeyOf(desc, dpr).key ? desc : cached.desc
}

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
  private readonly stats?: SceneStats
  dpr = 1
  /** What the visible canvas last showed: the layers and their animation state (an unchanged frame is not recomposited). */
  private shown: { layers: readonly LayerDesc[]; anim: string } | null = null
  private readonly shadows: ShadowComposite
  private paintedLayers?: { layers: readonly LayerDesc[]; dpr: number; cache: LayerCache | RemoteCache }
  private order: { layers: readonly LayerDesc[]; passes: ReturnType<typeof compositeOrder> } | null = null

  readonly canvas: LayerCanvas

  constructor(canvas: LayerCanvas, options: SurfaceOptions = {}) {
    this.canvas = canvas
    this.cache = new LayerCache(options)
    this.shadows = new ShadowComposite(options.factory ?? defaultFactory())
    this.now = options.now ?? (() => performance.now())
    this.onArrive = options.onArrive
    this.stats = options.stats
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
    if (this.paintedLayers?.dpr !== dpr) this.paintedLayers = undefined
    if (this.canvas.width !== w) { this.canvas.width = w; this.shown = null }
    if (this.canvas.height !== h) { this.canvas.height = h; this.shown = null }
  }

  fresh(desc: LayerDesc) {
    if (desc.kind === 'contrail') return true
    const shade = shadeLayer(desc)
    return this.active.fresh(desc, this.dpr) && (!shade || this.active.fresh(shade, this.dpr))
  }

  /** Brings a layer up to date: painted here, or asked of the worker (sent by `flush`, or by `render`). */
  paint(desc: LayerDesc, phase = 0): Painted {
    this.paintedLayers = undefined
    if (desc.kind === 'contrail') return 'none'
    const painted = this.active.update(desc, this.dpr, this.still ? 0 : phase)
    const shade = shadeLayer(desc)
    if (shade) this.active.update(shade, this.dpr, this.still ? 0 : phase)
    return painted
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
    this.paintedLayers = undefined
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
    if (this.order?.layers !== layers) this.order = { layers, passes: compositeOrder(layers) }
    for (const desc of this.order.passes) {
      if (desc.kind === 'contrail') { paintContrail(ctx, desc, motion, still, d); continue }
      const cached = cache.peek(desc.id)
      if (!cached) continue
      const layout = layoutOf(desc, cached, d)
      if (layout.kind === 'canopy' && !canopyMatchesPlane(layout, cached, cache)) continue
      // The main thread paints a strip's frames on demand, using the description that matches its canvas.
      const { form, light, ratio, rect } = cached
      // At the device's ratio a whole-pixel blit (the fast path); a stale canvas of another ratio is scaled until
      // it is repainted.
      const k = d / ratio
      const anim = layout.animated
      const alpha = flashAt(anim, motion) * fadeAt(anim, phase, still) * (anim?.alpha ?? 1)
      if (alpha <= 0.003) continue
      const reach = revealAt(anim, phase, this.width, still)
      if (reach < 0) continue
      // Unplaced closed tracks (clothesline drips) retain their whole-device-pixel offsets.
      const flown = trackAt(anim?.flight, motion, still)
      if (!flown) continue
      const fx = Math.round(flown.x * d), fy = Math.round(flown.y * d)
      // The clothesline's gust (`Sway`), applied after the flight.
      const sway = swayAt(anim?.sway, motion, still)
      // The sky's life, laid where its object is at the shown minute (painted round its own origin), scaled and faded.
      const lay = layout.placed
      const opacity = alpha * (lay?.alpha ?? 1) * flown.alpha
      if (opacity <= 0.003) continue
      ctx.globalAlpha = Math.min(1, opacity)
      const clipped = lay?.above !== undefined
      if (clipped) ctx.save()
      if (lay?.above !== undefined) {
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
        if (k === 1 && form) this.fall(form, layout, rect, motion, period, shift, alpha)
        if (clipped) ctx.restore()
        ctx.globalAlpha = 1
        continue
      }
      const frame = still ? 0 : frameAt(anim, motion)
      const shade = shadeLayer(layout)
      const shadow = shade && (layout.kind === 'plane' || layout.kind === 'canopy') ? layout.cloudShadow : undefined
      const dark = shadow && shade && light && cached.lightKey === (layout.light!.key + stripKey(layout))
        ? cache.peek(shade.id) : null
      const matchedShade = dark?.light && dark.ratio === ratio && dark.formKey === cached.formKey
        && shade?.light && dark.lightKey === (shade.light.key + stripKey(layout)) ? dark.light : null
      // The main-thread cache resolves missing gust poses when first displayed. Preview endpoints share pose zero.
      const preview = ('preview' in cached && cached.preview) || (dark && 'preview' in dark && dark.preview)
      const framePhase = still || preview ? 0 : motion
      if (cache instanceof LayerCache && anim?.frames) {
        cache.ensureFrame(layout, framePhase)
        if (shade && matchedShade) cache.ensureFrame(shade, framePhase)
      }
      const draw = (image: CanvasImageSource | OffscreenCanvas) => {
        const source = image as CanvasImageSource
        // A strip (C7): the frame at this phase, of the frames the canvas holds.
        const held = Math.max(1, Math.round((image as { height: number }).height / rect.h))
        const sy = held > 1 ? ((preview ? 0 : frame) % held) * rect.h : 0
        if (lay) {
          const sc = lay.scale * flown.scale * k
          const turn = (lay.turn ?? 0) + flown.turn
          const cos = Math.cos(turn), sin = Math.sin(turn)
          const x = (lay.x + flown.x) * d, y = (lay.y + flown.y) * d
          if (sway) {
            ctx.setTransform(sway[0], sway[1], sway[2], sway[3], sway[4] * d, sway[5] * d)
            ctx.transform(cos * sc, sin * sc, -sin * sc, cos * sc, x, y)
          } else {
            ctx.setTransform(cos * sc, sin * sc, -sin * sc, cos * sc, x, y)
          }
          ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h)
          ctx.setTransform(1, 0, 0, 1, 0, 0)
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
        if (anim?.advect && k === 1) return layCarried(ctx, source, rect, y, anim.advect, carriedS(anim, phase, still), d)
        if (fx || fy) return ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x + fx, y + fy, rect.w, rect.h)
        if (!period) return held > 1 || dy ? ctx.drawImage(source, 0, sy, rect.w, rect.h, rect.x, y, rect.w, rect.h) : ctx.drawImage(source, rect.x, rect.y)
        for (let x = rect.x + shift - period * Math.ceil((rect.x + shift + rect.w) / period); x < this.canvas.width; x += period) {
          if (x + rect.w > 0) ctx.drawImage(source, 0, sy, rect.w, rect.h, x, y, rect.w, rect.h)
        }
      }
      if (form && !cache.formless(layout)) {
        if (layout.blend) ctx.globalCompositeOperation = layout.blend
        draw(form)
        if (layout.blend) ctx.globalCompositeOperation = 'source-over'
      }
      if (light && layout.light) {
        ctx.globalCompositeOperation = layout.light.blend
        const sy = (preview ? 0 : frame) * rect.h
        const mixed = shadow && matchedShade && this.shadows.blend(light as CanvasImageSource,
          matchedShade as CanvasImageSource, shadow, rect, ratio, shadowSeconds(shadow, phase, still), sy)
        if (!mixed) draw(light)
        else if (anim?.reveal && Number.isFinite(reach)) this.window(mixed, rect, 0, y, anim.reveal, reach, alpha)
        else ctx.drawImage(mixed, 0, 0, rect.w, rect.h, rect.x * k, y * k, rect.w * k, rect.h * k)
        ctx.globalCompositeOperation = 'source-over'
      }
      if (this.stats?.trackShown) this.markShown(desc, cache.fresh(desc, d))
      if (clipped) ctx.restore()
      ctx.globalAlpha = 1
    }
  }

  private markShown(desc: LayerDesc, fresh: boolean) {
    if (!this.stats) return
    const existing = this.stats.shown[desc.id]
    if (fresh) {
      const lk = desc.light?.key ?? null
      if (!existing) this.stats.shown[desc.id] = { key: desc.key, lightKey: lk, fresh: true }
      else if (existing.key !== desc.key || existing.lightKey !== lk || !existing.fresh) {
        existing.key = desc.key; existing.lightKey = lk; existing.fresh = true
      }
    } else if (existing && existing.fresh) existing.fresh = false
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
    for (const desc of layers) {
      if (desc.kind === 'contrail') { out += `${trailTimeAt(desc, motion, still)};`; continue }
      const layer = layoutOf(desc, this.active.peek(desc.id), this.dpr)
      if ((layer.kind === 'plane' || layer.kind === 'canopy') && layer.cloudShadow?.speed && this.active.peek(shadeId(layer.id))?.light) {
        const shadow = layer.cloudShadow
        out += `s${Math.round(shadowSeconds(shadow, phase, still) * shadow.speed * this.dpr * 16)};`
      }
      const anim = layer.animated
      if (!anim) continue
      out += `${Math.round(driftAt(anim, motion) * this.dpr)}:${Math.round(flashAt(anim, motion) * 255)}:${still ? 0 : frameAt(anim, motion)}`
      if (anim.fall) {
        const off = fallAt(anim, motion, layer.bounds)
        out += `:${Math.round(off.x * this.dpr)},${Math.round(off.y * this.dpr)}`
      }
      if (anim.fade || anim.breath) out += `:${Math.round(fadeAt(anim, phase, still) * 255)}`
      if (anim.glide) out += `:${Math.round(glideAt(anim, phase, still) * this.dpr)}`
      if (anim.advect) out += `:${Math.round(carriedS(anim, phase, still) * 30)}`
      if (anim.reveal) out += `:${Math.round(Math.min(1e5, revealAt(anim, phase, this.width, still)) * this.dpr)}`
      if (anim.flight) {
        const f = trackAt(anim.flight, motion, still)
        out += f ? `:${Math.round(f.x * this.dpr * 16)},${Math.round(f.y * this.dpr * 16)},${Math.round(f.scale * 1024)},${Math.round(f.alpha * 1024)},${Math.round(f.turn * 1024)}` : ':off'
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
    this.phase = phase
    this.still = still
    const active = this.active
    const unchanged = this.paintedLayers?.layers === layers && this.paintedLayers.dpr === this.dpr && this.paintedLayers.cache === active
    if (!unchanged) {
      const keep = new Set<string>()
      for (const layer of layers) {
        keep.add(layer.id)
        const shade = shadeLayer(layer)
        if (shade) keep.add(shade.id)
      }
      this.prune(keep)
    }
    const painted = unchanged ? layers.map((): Painted => 'none') : layers.map((desc) => this.paint(desc, phase))
    if (!unchanged) this.paintedLayers = { layers, dpr: this.dpr, cache: active }
    if (this.stats?.trackShown) {
      for (const desc of layers) {
        const existing = this.stats.shown[desc.id]
        if (existing && existing.fresh && !this.fresh(desc)) existing.fresh = false
      }
    }
    this.flush()
    // An animation tick that moved nothing a whole pixel (and repainted or asked for nothing) leaves the canvas as it is.
    if (this.shown && this.shown.layers === layers && this.shown.anim === this.animState(layers, phase, still)
      && painted.every((p) => p === 'none')) return painted
    this.composite(layers, phase, still)
    return painted
  }

  /** Backing memory: the visible canvas and the cached layers (bytes). */
  bytes() {
    return this.canvas.width * this.canvas.height * 4 + this.active.bytes() + this.shadows.bytes()
  }

  get size() {
    return { width: this.width, height: this.height }
  }
}

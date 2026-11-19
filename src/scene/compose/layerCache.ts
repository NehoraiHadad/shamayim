import { cacheRatio } from '../model/keys'
import type { LayerDesc } from '../model/types'
import { HAND, painterOf, type Ctx2D, type Hand, type PaintEnv, type Painter } from '../paint'
import type { SceneStats } from './stats'

/** A canvas a layer is cached on: an `OffscreenCanvas` where there is one, else a detached `<canvas>`. */
export type LayerCanvas = HTMLCanvasElement | OffscreenCanvas
export type CanvasFactory = (width: number, height: number) => LayerCanvas

export function defaultFactory(): CanvasFactory {
  if (typeof OffscreenCanvas !== 'undefined') return (w, h) => new OffscreenCanvas(w, h)
  return (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h })
}

export const ctxOf = (canvas: LayerCanvas) => (canvas as HTMLCanvasElement).getContext('2d') as unknown as Ctx2D

/** A layer's canvas in device px: whole pixels, so it is laid into the surface 1:1. */
export interface DeviceRect { x: number; y: number; w: number; h: number }

export function deviceRect(desc: LayerDesc, ratio: number): DeviceRect {
  const { x, y, w, h } = desc.bounds
  const x0 = Math.floor(x * ratio + 1e-6), y0 = Math.floor(y * ratio + 1e-6)
  return { x: x0, y: y0, w: Math.max(1, Math.ceil((x + w) * ratio - 1e-6) - x0), h: Math.max(1, Math.ceil((y + h) * ratio - 1e-6) - y0) }
}

interface Entry {
  /** The key the form canvas holds (the layer's key, its pixel ratio and bounds). */
  formKey: string
  lightKey: string | null
  ratio: number
  rect: DeviceRect
  form: LayerCanvas
  light: LayerCanvas | null
}

export interface CacheOptions {
  factory?: CanvasFactory
  painters?: (desc: LayerDesc) => Painter | undefined
  hand?: Hand
  stats?: SceneStats
  now?: () => number
}

export type Painted = 'none' | 'light' | 'form'

/**
 * One offscreen canvas per layer (§1d), sized to its bounds × its pixel ratio (`min(dpr, 2)` for soft layers, `dpr`
 * for the rest), repainted only when its key changes. A layer with a light part keeps its form and its light on two
 * canvases: a change of light (a scrub frame) repaints the light canvas only. The light painter keeps inside the form's
 * shape itself (it clips to the outline it is given), and the surface lays the light over the form with the light's
 * blend, so nothing is recombined per frame.
 */
export class LayerCache {
  private entries = new Map<string, Entry>()
  private readonly factory: CanvasFactory
  private readonly painters: (desc: LayerDesc) => Painter | undefined
  private readonly hand: Hand
  private readonly stats?: SceneStats
  private readonly now: () => number

  constructor(options: CacheOptions = {}) {
    this.factory = options.factory ?? defaultFactory()
    this.painters = options.painters ?? painterOf
    this.hand = options.hand ?? HAND
    this.stats = options.stats
    this.now = options.now ?? (() => performance.now())
  }

  private formKeyOf(desc: LayerDesc, dpr: number) {
    const ratio = cacheRatio(dpr, desc.soft)
    const { x, y, w, h } = desc.bounds
    return { ratio, key: `${desc.key}@${ratio}:${x},${y},${w},${h}` }
  }

  /** The layer's canvas is up to date for this desc and dpr. */
  fresh(desc: LayerDesc, dpr: number): boolean {
    const entry = this.entries.get(desc.id)
    return Boolean(entry && entry.formKey === this.formKeyOf(desc, dpr).key && entry.lightKey === (desc.light?.key ?? null))
  }

  /** The canvases last painted for a layer (possibly stale): its form, its light (if any), their ratio and place. */
  peek(id: string): { form: LayerCanvas; light: LayerCanvas | null; ratio: number; rect: DeviceRect } | null {
    const entry = this.entries.get(id)
    return entry ? { form: entry.form, light: entry.lightKey ? entry.light : null, ratio: entry.ratio, rect: entry.rect } : null
  }

  private paintOn(canvas: LayerCanvas, desc: LayerDesc, ratio: number, rect: DeviceRect, paint: Painter['form'], phase: number) {
    const ctx = ctxOf(canvas)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(ratio, 0, 0, ratio, -rect.x, -rect.y)
    const env: PaintEnv = { hand: this.hand, phase, scale: ratio, canvas: (w, h) => {
      const scratch = this.factory(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)))
      return { canvas: scratch, ctx: ctxOf(scratch) }
    } }
    paint(ctx, desc, env)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  /** Brings a layer's canvas up to date: what had to be painted (`none` is a cache hit). */
  update(desc: LayerDesc, dpr: number, phase = 0): Painted {
    const stat = this.stats?.layer(desc.id)
    const painter = this.painters(desc)
    const { ratio, key: formKey } = this.formKeyOf(desc, dpr)
    const lightKey = painter?.light && desc.light ? desc.light.key : null
    let entry = this.entries.get(desc.id)
    if (entry && entry.formKey === formKey && entry.lightKey === lightKey) {
      if (stat) stat.hits++
      return 'none'
    }
    const start = this.now()
    const rect = deviceRect(desc, ratio)
    const { w, h } = rect
    const resized = !entry || entry.form.width !== w || entry.form.height !== h
    if (!entry || resized) {
      const form = this.factory(w, h)
      const light = lightKey ? this.factory(w, h) : null
      entry = { formKey: '', lightKey: null, ratio, rect, form, light }
      this.entries.set(desc.id, entry)
    }
    if (entry.formKey !== formKey) entry.lightKey = null
    let painted: Painted = 'light'
    if (entry.formKey !== formKey) {
      entry.rect = rect
      entry.ratio = ratio
      if (painter) this.paintOn(entry.form, desc, ratio, rect, painter.form, phase)
      else ctxOf(entry.form).clearRect(0, 0, w, h)
      entry.formKey = formKey
      painted = 'form'
    }
    if (lightKey && painter?.light) {
      entry.light ??= this.factory(w, h)
      if (entry.lightKey !== lightKey) this.paintOn(entry.light, desc, ratio, entry.rect, painter.light, phase)
    }
    entry.lightKey = lightKey
    if (stat) {
      if (painted === 'form') stat.paints++
      else stat.lightPaints++
      stat.lastMs = this.now() - start
    }
    return painted
  }

  /** Drops the layers no longer in the model. */
  prune(keep: ReadonlySet<string>) {
    for (const id of this.entries.keys()) if (!keep.has(id)) this.entries.delete(id)
  }

  /** Backing memory of the cached canvases (bytes, RGBA). */
  bytes(): number {
    let total = 0
    for (const entry of this.entries.values()) {
      for (const canvas of [entry.form, entry.light]) if (canvas) total += canvas.width * canvas.height * 4
    }
    return total
  }
}

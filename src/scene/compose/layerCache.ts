import { frameAt, frameCount } from '../model/anim'
import type { LayerDesc } from '../model/types'
import { HAND, painterOf, type Ctx2D, type Hand, type Painter } from '../paint'
import { canvasSize, deviceRect, formKeyOf, lightKeyOf, paintPart, type DeviceRect } from './paintJob'
import type { SceneStats } from './stats'

export { deviceRect, type DeviceRect } from './paintJob'

/** A canvas a layer is cached on: an `OffscreenCanvas` where there is one, else a detached `<canvas>`. */
export type LayerCanvas = HTMLCanvasElement | OffscreenCanvas
export type CanvasFactory = (width: number, height: number) => LayerCanvas

export function defaultFactory(): CanvasFactory {
  if (typeof OffscreenCanvas !== 'undefined') return (w, h) => new OffscreenCanvas(w, h)
  return (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h })
}

export const ctxOf = (canvas: LayerCanvas) => (canvas as HTMLCanvasElement).getContext('2d') as unknown as Ctx2D

interface Entry {
  /** The key the form canvas holds (the layer's key, its pixel ratio and bounds). */
  formKey: string
  desc: LayerDesc
  lightKey: string | null
  ratio: number
  rect: DeviceRect
  form: LayerCanvas
  light: LayerCanvas | null
  /** A strip's frames painted so far on each canvas (C7): the main thread paints a frame when it is first laid. */
  formFrames?: Set<number>
  lightFrames?: Set<number>
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

  /** The layer's canvas is up to date for this desc and dpr. */
  fresh(desc: LayerDesc, dpr: number): boolean {
    const entry = this.entries.get(desc.id)
    return Boolean(entry && entry.formKey === formKeyOf(desc, dpr).key && entry.lightKey === lightKeyOf(desc, this.painters(desc)))
  }

  /** The canvases last painted for a layer (possibly stale): its form, its light (if any), their ratio and place. */
  /** The layer's form draws nothing under its light (`Painter.formless`): the surface lays its light alone. */
  formless(desc: LayerDesc): boolean {
    return Boolean(desc.light && this.painters(desc)?.formless?.(desc))
  }

  peek(id: string) {
    const entry = this.entries.get(id)
    return entry ? { form: entry.form, light: entry.lightKey ? entry.light : null, ratio: entry.ratio, rect: entry.rect,
      formKey: entry.formKey, desc: entry.desc } : null
  }

  private paintOn(canvas: LayerCanvas, desc: LayerDesc, ratio: number, rect: DeviceRect, paint: Painter['form'], phase: number,
    only?: readonly number[]) {
    paintPart(ctxOf(canvas), canvas, desc, ratio, rect, paint, phase, this.hand, (w, h) => {
      const scratch = this.factory(w, h)
      return { canvas: scratch, ctx: ctxOf(scratch) }
    }, only)
  }

  /**
   * A strip's frame at `phase` is painted (C7): on the main thread a strip is painted a frame at a time, the frame shown
   * when its key changes and the others as the loop first lays them, so a scrub frame pays for one frame, not the strip.
   */
  ensureFrame(desc: LayerDesc, phase: number) {
    if (frameCount(desc.animated) === 1) return
    const entry = this.entries.get(desc.id)
    const painter = this.painters(desc)
    if (!entry || !painter) return
    const f = frameAt(desc.animated, phase)
    if (entry.formFrames && !entry.formFrames.has(f) && !this.formless(desc)) {
      this.paintOn(entry.form, desc, entry.ratio, entry.rect, painter.form, phase, [f])
      entry.formFrames.add(f)
    }
    if (entry.light && entry.lightKey && painter.light && entry.lightFrames && !entry.lightFrames.has(f)) {
      this.paintOn(entry.light, desc, entry.ratio, entry.rect, painter.light, phase, [f])
      entry.lightFrames.add(f)
    }
  }

  /** Brings a layer's canvas up to date: what had to be painted (`none` is a cache hit). */
  update(desc: LayerDesc, dpr: number, phase = 0): Painted {
    const stat = this.stats?.layer(desc.id)
    const painter = this.painters(desc)
    const { ratio, key: formKey } = formKeyOf(desc, dpr)
    const lightKey = lightKeyOf(desc, painter)
    let entry = this.entries.get(desc.id)
    if (entry?.formKey === formKey) entry.desc = desc
    if (entry && entry.formKey === formKey && entry.lightKey === lightKey) {
      if (stat) stat.hits++
      return 'none'
    }
    const start = this.now()
    const rect = deviceRect(desc, ratio)
    const { w, h } = canvasSize(desc, rect)
    const strip = frameCount(desc.animated) > 1
    const frame = frameAt(desc.animated, phase)
    const resized = !entry || entry.form.width !== w || entry.form.height !== h
    if (!entry || resized) {
      const form = this.factory(w, h)
      const light = lightKey ? this.factory(w, h) : null
      entry = { formKey: '', desc, lightKey: null, ratio, rect, form, light }
      this.entries.set(desc.id, entry)
    }
    if (entry.formKey !== formKey) entry.lightKey = null
    let painted: Painted = 'light'
    if (entry.formKey !== formKey) {
      entry.rect = rect
      entry.ratio = ratio
      ctxOf(entry.form).clearRect(0, 0, w, h)
      if (painter && !this.formless(desc)) this.paintOn(entry.form, desc, ratio, rect, painter.form, phase, strip ? [frame] : undefined)
      entry.formFrames = strip ? new Set([frame]) : undefined
      entry.formKey = formKey
      entry.desc = desc
      painted = 'form'
    }
    if (lightKey && painter?.light) {
      entry.light ??= this.factory(w, h)
      if (entry.lightKey !== lightKey) {
        if (strip) ctxOf(entry.light).clearRect(0, 0, w, h)
        this.paintOn(entry.light, desc, ratio, entry.rect, painter.light, phase, strip ? [frame] : undefined)
        entry.lightFrames = strip ? new Set([frame]) : undefined
      }
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

import { shadowSeconds, shadowStep } from '../model/planeCloudShadow'
import type { LayerOf } from '../model/types'
import type { Ctx2D } from '../paint'
import { ctxOf, type CanvasFactory, type LayerCache, type LayerCanvas } from './layerCache'
import type { DeviceRect } from './paintJob'
import type { RemoteCache } from './remoteCache'
import { intersect, MASK_TEXEL, ShadowComposite } from './shadowComposite'
import { CanopyBlend } from './canopyBlend'

type Cache = LayerCache | RemoteCache
type Cached = NonNullable<ReturnType<Cache['peek']>>
type Plane = LayerOf<'plane'>
type Endpoints = Pick<Cached, 'light' | 'shade' | 'rect' | 'ratio'>

interface Patch {
  canvas: LayerCanvas
  revision: number
  beam: Cached['light']
  shade: Cached['shade']
  sy: number
  opaque: boolean
}

interface DrawReceiver {
  ctx: Ctx2D
  id: string
  cached: Endpoints
  plane: Cached
  phase: number
  still: boolean
  interactive: boolean
  opaque: boolean
  sy: number
  y: number
  scale: number
  draw: (image: CanvasImageSource) => void
  reveal?: (image: CanvasImageSource, rect: DeviceRect) => void
}

/** Receiver colour stays fixed in land coordinates while the shared transmission mask moves over it. */
export class ReceiverComposite {
  private readonly masks: ShadowComposite
  private readonly canopy: CanopyBlend
  // One patch per receiver. Gust frames reuse the backing store without retaining a strip of patches.
  private patches = new Map<string, Patch>()
  private tint?: LayerCanvas

  private readonly factory: CanvasFactory
  constructor(factory: CanvasFactory) {
    this.factory = factory
    this.masks = new ShadowComposite(factory)
    this.canopy = new CanopyBlend(factory)
  }

  draw({ ctx, id, cached, plane, phase, still, interactive, opaque, sy, y, scale, draw, reveal }: DrawReceiver) {
    const shadow = (plane.lightDesc as Plane).cloudShadow
    const beam = cached.light as CanvasImageSource
    if (!shadow || !cached.shade || !plane.shade || cached.ratio !== plane.ratio) return draw(beam)
    const seconds = shadowSeconds(shadow, phase, still)
    const step = interactive && !still ? shadowStep(shadow, phase, still, plane.ratio) : -seconds - 1
    const mask = this.masks.maskAt(plane.desc.id, shadow, plane.rect, plane.ratio, seconds, step)
    const rect = cached.rect, box = mask.box && intersect(mask.box, rect)
    if (!box) return draw(beam)
    if (interactive && id !== plane.desc.id && !reveal) {
      const mixed = this.canopy.mix(id, beam, cached.shade as CanvasImageSource, rect, mask, box, sy)
      return draw(mixed as CanvasImageSource)
    }
    const patch = this.patch(id, cached, mask, box, sy, opaque)
    const { x, w, h } = box, top = y + box.y - rect.y
    if (opaque) {
      draw(beam)
      // Only the already laid, opaque terrain receives the masked shade sprite.
      ctx.globalCompositeOperation = 'source-atop'
    } else {
      ctx.save()
      ctx.beginPath()
      ctx.rect(rect.x * scale, y * scale, rect.w * scale, rect.h * scale)
      ctx.rect(x * scale, top * scale, w * scale, h * scale)
      ctx.clip('evenodd')
      draw(beam)
      ctx.restore()
    }
    const image = patch.canvas as CanvasImageSource
    if (reveal) reveal(image, { x, y: top, w, h })
    else ctx.drawImage(image, 0, 0, w, h, x * scale, top * scale, w * scale, h * scale)
  }

  private patch(id: string, cached: Endpoints, mask: ReturnType<ShadowComposite['maskAt']>, box: DeviceRect, sy: number, opaque: boolean) {
    const held = this.patches.get(id)
    if (held?.revision === mask.revision && held.beam === cached.light && held.shade === cached.shade
      && held.sy === sy && held.opaque === opaque) return held
    const { x, y, w, h } = box
    const canvas = held && held.canvas.width >= w && held.canvas.height >= h ? held.canvas : this.factory(w, h)
    if (!opaque && (!this.tint || this.tint.width < w || this.tint.height < h)) {
      this.tint = this.factory(Math.max(w, this.tint?.width ?? 0), Math.max(h, this.tint?.height ?? 0))
    }
    const x0 = x - cached.rect.x, y0 = sy + y - cached.rect.y
    const maskW = mask.canvas.width * MASK_TEXEL * mask.ratio, maskH = mask.canvas.height * MASK_TEXEL * mask.ratio
    const stampMask = (target: Ctx2D) => target.drawImage(mask.canvas as CanvasImageSource,
      mask.rect.x - x, mask.rect.y - y, maskW, maskH)
    const fill = ctxOf(opaque ? canvas : this.tint!)
    fill.globalCompositeOperation = 'source-over'
    fill.clearRect(0, 0, w, h)
    fill.drawImage(cached.shade as CanvasImageSource, x0, y0, w, h, 0, 0, w, h)
    fill.globalCompositeOperation = 'destination-in'
    stampMask(fill)
    if (!opaque) {
      const base = ctxOf(canvas)
      base.globalCompositeOperation = 'source-over'
      base.clearRect(0, 0, w, h)
      base.drawImage(cached.light as CanvasImageSource, x0, y0, w, h, 0, 0, w, h)
      base.globalCompositeOperation = 'destination-out'
      stampMask(base)
      // Sum the weighted endpoints in premultiplied RGBA, retaining coverage at canopy and crest edges.
      base.globalCompositeOperation = 'lighter'
      base.drawImage(this.tint as CanvasImageSource, 0, 0, w, h, 0, 0, w, h)
    }
    const patch = { canvas, revision: mask.revision, beam: cached.light, shade: cached.shade, sy, opaque }
    this.patches.set(id, patch)
    return patch
  }

  prune(keep: ReadonlySet<string>) {
    this.masks.prune(keep)
    this.canopy.prune(keep)
    for (const id of this.patches.keys()) if (!keep.has(id)) this.patches.delete(id)
  }

  bytes() {
    let bytes = this.masks.bytes() + this.canopy.bytes() + (this.tint ? this.tint.width * this.tint.height * 4 : 0)
    for (const { canvas } of this.patches.values()) bytes += canvas.width * canvas.height * 4
    return bytes
  }
}

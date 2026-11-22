import { shadowSeconds, shadowStep } from '../model/planeCloudShadow'
import { ReceiverBlend } from './receiverBlend'
import type { CanvasFactory, LayerCache } from './layerCache'
import type { RemoteCache } from './remoteCache'
import { intersect, ShadowComposite } from './shadowComposite'

type Cached = NonNullable<ReturnType<(LayerCache | RemoteCache)['peek']>>
type Endpoints = Pick<Cached, 'light' | 'shade' | 'rect' | 'ratio'>

interface DrawReceiver {
  id: string
  cached: Endpoints
  plane: Cached
  phase: number
  still: boolean
  exact: boolean
  sy: number
  draw: (image: CanvasImageSource) => void
}

/** Receiver colour stays fixed in land coordinates while the shared transmission mask moves over it. */
export class ReceiverComposite {
  private readonly masks: ShadowComposite
  private readonly blend: ReceiverBlend

  constructor(factory: CanvasFactory) {
    this.masks = new ShadowComposite()
    this.blend = new ReceiverBlend(factory)
  }

  draw({ id, cached, plane, phase, still, exact, sy, draw }: DrawReceiver) {
    const shadow = plane.lightDesc.kind === 'plane' && plane.lightDesc.cloudShadow
    const beam = cached.light as CanvasImageSource, shade = cached.shade as CanvasImageSource
    if (!shadow || !shade || !plane.shade || cached.ratio !== plane.ratio) return draw(beam)
    const seconds = shadowSeconds(shadow, phase, still)
    const step = exact ? -seconds - 1 : shadowStep(shadow, phase, still, plane.ratio)
    const mask = this.masks.maskAt(plane.desc.id, shadow, plane.rect, plane.ratio, seconds, step)
    const rect = cached.rect, box = mask.box && intersect(mask.box, rect)
    if (!box) return draw(beam)
    const mixed = this.blend.mix(id, beam, shade, rect, mask, box, sy)
    draw(mixed as CanvasImageSource)
  }

  invalidate(id: string) {
    this.blend.invalidate(id)
  }

  prune(keep: ReadonlySet<string>) {
    this.masks.prune(keep)
    this.blend.prune(keep)
  }

  bytes() {
    return this.masks.bytes() + this.blend.bytes()
  }
}

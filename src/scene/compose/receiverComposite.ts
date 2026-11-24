import { shadowSeconds, shadowStep } from '../model/planeCloudShadow'
import { ReceiverBlend } from './receiverBlend'
import type { CanvasFactory, LayerCache } from './layerCache'
import type { RemoteCache } from './remoteCache'
import type { PaintPose } from './paintJob'
import { intersect, ShadowComposite } from './shadowComposite'

type Cached = NonNullable<ReturnType<(LayerCache | RemoteCache)['peek']>>
type Endpoints = Pick<Cached, 'light' | 'lightKey' | 'shade' | 'rect' | 'ratio'>

interface DrawReceiver {
  id: string
  cached: Endpoints
  plane: Cached
  phase: number
  still: boolean
  exact: boolean
  sy: number
  poses?: readonly PaintPose[]
  pose?: PaintPose
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

  draw({ id, cached, plane, phase, still, exact, sy, poses, pose, draw }: DrawReceiver) {
    const shadow = plane.lightDesc.kind === 'plane' && plane.lightDesc.cloudShadow
    const baseBeam = cached.light as CanvasImageSource
    const baseShade = cached.shade as CanvasImageSource | null
    const beam = pose?.bitmap ?? baseBeam
    const shade = pose?.shade ?? baseShade
    if (!shadow || !baseShade || !shade || !plane.shade || cached.ratio !== plane.ratio) {
      this.skip(id, cached, poses)
      return draw(beam)
    }
    const seconds = shadowSeconds(shadow, phase, still)
    const step = exact ? -seconds - 1 : shadowStep(shadow, phase, still, plane.ratio)
    const mask = this.masks.maskAt(plane.desc.id, shadow, plane.rect, plane.ratio, seconds, step)
    const rect = cached.rect, box = mask.box && intersect(mask.box, rect)
    if (!box) {
      this.blend.bindSources(id, baseBeam, baseShade, poses)
      return draw(beam)
    }
    const mixed = this.blend.mix(id, cached.lightKey, beam, shade, rect, mask, box, sy, poses, baseBeam, baseShade)
    draw(mixed as CanvasImageSource)
  }

  skip(id: string, cached: Endpoints, poses?: readonly PaintPose[]) {
    if (cached.light && cached.shade) {
      this.blend.bindSources(id, cached.light as CanvasImageSource, cached.shade as CanvasImageSource, poses)
      this.blend.skip(id)
    } else this.blend.invalidate(id)
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

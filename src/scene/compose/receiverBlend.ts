import type { CanvasFactory, LayerCanvas } from './layerCache'
import type { DeviceRect, PaintPose } from './paintJob'
import { blendPixels, maskSampling, type Sampling } from './receiverBlendMath'
import { cpuContext, ReceiverPixels } from './receiverPixels'
import { intersect, type ShadowMask } from './shadowComposite'

interface Frame {
  canvas: LayerCanvas
  rect: DeviceRect
  box: DeviceRect
  beam: CanvasImageSource
  shade: CanvasImageSource
  lightKey: string | null
  revision: number
  sy: number
  sampling: Sampling
  ratio: number
  buffer?: ImageData
}

type Poses = readonly Pick<PaintPose, 'bitmap' | 'shade'>[]
interface Sources {
  beam: CanvasImageSource
  shade: CanvasImageSource
  poses?: Poses
  bitmaps: ReadonlySet<CanvasImageSource>
}

const sameRect = (a: DeviceRect, b: DeviceRect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
const union = (a: DeviceRect, b: DeviceRect) => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

// One third of the 48 MiB scene.perf memory budget. Hold admitted crops until
// their source is released so a cyclic working set cannot evict itself.
const PIXEL_LIMIT = 48 * 2 ** 20 / 3

/** Blend affected receiver pixels and keep a single composited frame for each layer. */
export class ReceiverBlend {
  private readonly frames = new Map<string, Frame>()
  private readonly sources = new Map<string, Sources>()
  private readonly pixels: ReceiverPixels
  private readonly factory: CanvasFactory

  constructor(factory: CanvasFactory, pixelLimit = PIXEL_LIMIT) {
    this.factory = factory
    this.pixels = new ReceiverPixels(factory, pixelLimit)
  }

  mix(id: string, lightKey: string | null, beam: CanvasImageSource, shade: CanvasImageSource,
    rect: DeviceRect, mask: ShadowMask, box: DeviceRect, sy: number, poses?: Poses, baseBeam = beam, baseShade = shade) {
    this.bindSources(id, baseBeam, baseShade, poses)
    const held = this.frames.get(id)
    const sameSource = held && held.lightKey === lightKey && held.beam === beam && held.shade === shade
      && held.sy === sy && sameRect(held.rect, rect)
    if (sameSource && held.revision === mask.revision && held.ratio === mask.ratio
      && sameRect(held.sampling.rect, mask.rect) && sameRect(held.box, box)) return held.canvas
    // Any revision (including a new set of cloud stamps) can move the box inside the plane's mask.
    // The intersection covers that entire domain, and sy limits the read to this strip pose.
    const area = intersect(rect, mask.rect)!
    const crop = { x: area.x - rect.x, y: sy + area.y - rect.y, w: area.w, h: area.h }
    // Pose changes initialize the full output, including lit pixels beyond the mask domain.
    const lit = this.pixels.readCached(beam, { x: 0, y: sy, w: rect.w, h: rect.h })
    const cachedDark = this.pixels.readCached(shade, crop)

    const canvas = held?.canvas.width === rect.w && held.canvas.height === rect.h ? held.canvas : this.factory(rect.w, rect.h)
    const x = box.x - rect.x, y = box.y - rect.y
    // The blend writes CPU ImageData. Keep the existing CPU backing for this write path.
    const output = cpuContext(canvas)
    const sameFrame = sameSource && held.canvas === canvas
    const restore = sameFrame ? union(held.box, box) : rect
    const rx = restore.x - rect.x, ry = restore.y - rect.y
    // Mix from the fresh 1:1 draw's read bytes, including on restores. Outside the new
    // box, rounding 8-bit straight RGB back to premul costs less than half a premul step
    // for alpha < 255 (and is exact at 255), so put restores the original coverage and color.
    let buffer = held?.buffer
    let pixels: ImageData, px: number, py: number
    if (lit) {
      if (buffer?.width !== restore.w || buffer.height !== restore.h) buffer = output.createImageData(restore.w, restore.h)
      pixels = buffer
      px = rx
      py = ry
      for (let row = 0; row < restore.h; row++) {
        const start = ((ry + row) * rect.w + rx) * 4
        pixels.data.set(lit.data.subarray(start, start + restore.w * 4), row * restore.w * 4)
      }
    } else {
      output.globalCompositeOperation = sameFrame ? 'source-over' : 'copy'
      if (sameFrame) output.clearRect(rx, ry, restore.w, restore.h)
      output.drawImage(beam, rx, sy + ry, restore.w, restore.h, rx, ry, restore.w, restore.h)
      pixels = output.getImageData(x, y, box.w, box.h)
      buffer = undefined
      px = x
      py = y
    }
    const dark = cachedDark ?? this.pixels.readBox(shade, { x, y: sy + y, w: box.w, h: box.h })
    const sampling = held && held.ratio === mask.ratio && held.sampling.rect === mask.rect
      && sameRect(held.box, box) ? held.sampling : maskSampling(mask, box)
    const darkOffset = cachedDark ? (box.y - area.y) * crop.w + box.x - area.x : 0
    const litOffset = (y - py) * pixels.width + x - px
    blendPixels(pixels.data, dark.data, darkOffset, dark.width, mask.alpha, sampling, litOffset, pixels.width)
    output.putImageData(pixels, px, py)
    this.frames.set(id, { canvas, rect, box, beam, shade, lightKey, revision: mask.revision, sy, sampling, ratio: mask.ratio, buffer })
    return canvas
  }

  invalidate(id: string) {
    for (const source of this.sources.get(id)?.bitmaps ?? []) this.pixels.release(source)
    this.sources.delete(id)
    this.frames.delete(id)
  }

  bindSources(id: string, beam: CanvasImageSource, shade: CanvasImageSource, poses?: Poses) {
    const held = this.sources.get(id)
    if (held?.poses === poses && held?.beam === beam && held.shade === shade) return
    const next = new Set([beam, shade])
    for (const pose of poses ?? []) { next.add(pose.bitmap); next.add(pose.shade) }
    for (const source of next) if (!held?.bitmaps.has(source)) this.pixels.retain(source)
    for (const source of held?.bitmaps ?? []) if (!next.has(source)) this.pixels.release(source)
    this.sources.set(id, { beam, shade, poses, bitmaps: next })
    const frame = this.frames.get(id)
    if (frame && (!next.has(frame.beam) || !next.has(frame.shade))) this.frames.delete(id)
  }

  skip(id: string) { this.frames.delete(id) }

  prune(keep: ReadonlySet<string>) {
    for (const id of this.sources.keys()) if (!keep.has(id)) this.invalidate(id)
  }

  bytes() {
    let bytes = this.pixels.bytes()
    for (const { canvas, sampling, buffer } of this.frames.values()) bytes += canvas.width * canvas.height * 4
      + (buffer?.data.byteLength ?? 0)
      + (sampling.columns.indices.length + sampling.rows.indices.length) * 12
    return bytes
  }
}

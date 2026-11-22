import { type CanvasFactory, type LayerCanvas } from './layerCache'
import type { Ctx2D } from '../paint'
import type { DeviceRect } from './paintJob'
import { MASK_TEXEL, type ShadowMask } from './shadowComposite'

interface Frame {
  canvas: LayerCanvas
  box: DeviceRect
  beam: CanvasImageSource
  shade: CanvasImageSource
  revision: number
  sy: number
  weights: Uint8Array
}

const context = (canvas: LayerCanvas) => canvas.getContext('2d', { willReadFrequently: true }) as Ctx2D

/** Blend only affected foliage pixels and keep a single composited frame for each visible canopy. */
export class CanopyBlend {
  private frames = new Map<string, Frame>()
  private scratch?: LayerCanvas
  private readonly factory: CanvasFactory

  constructor(factory: CanvasFactory) { this.factory = factory }

  mix(id: string, beam: CanvasImageSource, shade: CanvasImageSource, rect: DeviceRect, mask: ShadowMask, box: DeviceRect, sy: number) {
    const held = this.frames.get(id)
    if (held && held.beam === beam && held.shade === shade && held.revision === mask.revision && held.sy === sy) return held.canvas
    const canvas = held?.canvas.width === rect.w && held.canvas.height === rect.h ? held.canvas : this.factory(rect.w, rect.h)
    const { w, h } = box, x = box.x - rect.x, y = box.y - rect.y
    if (!this.scratch || this.scratch.width < w || this.scratch.height < h) {
      this.scratch = this.factory(Math.max(w, this.scratch?.width ?? 0), Math.max(h, this.scratch?.height ?? 0))
    }
    const output = context(canvas), scratch = context(this.scratch)
    output.globalCompositeOperation = 'copy'
    scratch.globalCompositeOperation = 'copy'
    output.drawImage(beam, 0, sy, rect.w, rect.h, 0, 0, rect.w, rect.h)
    scratch.drawImage(shade, x, sy + y, w, h, 0, 0, w, h)
    const pixels = output.getImageData(x, y, w, h)
    const sameMask = held?.revision === mask.revision && held.box.x === box.x && held.box.y === box.y
      && held.box.w === w && held.box.h === h
    const weights = sameMask ? held.weights : maskWeights(mask, box)
    blendPixels(pixels.data, scratch.getImageData(0, 0, w, h).data, weights)
    output.putImageData(pixels, x, y)
    this.frames.set(id, { canvas, box, beam, shade, revision: mask.revision, sy, weights })
    return canvas
  }

  prune(keep: ReadonlySet<string>) {
    for (const id of this.frames.keys()) if (!keep.has(id)) this.frames.delete(id)
  }

  bytes() {
    let bytes = this.scratch ? this.scratch.width * this.scratch.height * 4 : 0
    for (const { canvas, weights } of this.frames.values()) bytes += canvas.width * canvas.height * 4 + weights.byteLength
    return bytes
  }
}

function maskWeights(mask: ShadowMask, box: DeviceRect): Uint8Array {
  const { image, active } = mask
  const weights = new Uint8Array(box.w * box.h)
  if (!active) return weights
  const texel = MASK_TEXEL * mask.ratio
  const x0 = (box.x + 0.5 - mask.rect.x) / texel - 0.5, y0 = (box.y + 0.5 - mask.rect.y) / texel - 0.5
  const index = (x: number, y: number) => x >= active.x && x < active.x + active.w && y >= active.y && y < active.y + active.h
    ? image.data[(y * image.width + x) * 4 + 3] : 0
  const clamp = (v: number, n: number) => Math.max(0, Math.min(v, n - 1))
  for (let y = 0; y < box.h; y++) {
    const v = clamp(y0 + y / texel, image.height)
    const j = Math.floor(v), dy = v - j
    for (let x = 0; x < box.w; x++) {
      const u = clamp(x0 + x / texel, image.width)
      const column = Math.floor(u), dx = u - column
      const top = index(column, j) * (1 - dx) + index(column + 1, j) * dx
      const bottom = index(column, j + 1) * (1 - dx) + index(column + 1, j + 1) * dx
      weights[y * box.w + x] = Math.round(top * (1 - dy) + bottom * dy)
    }
  }
  return weights
}

/** Interpolate premultiplied colours, then return the straight-alpha pixels required by ImageData. */
function blendPixels(beam: Uint8ClampedArray, shade: Uint8ClampedArray, weights: Uint8Array) {
  for (let p = 0; p < weights.length; p++) {
    const w = weights[p], i = p * 4, a = beam[i + 3], b = shade[i + 3]
    if (!w || !(a || b)) continue
    const lit = a * (255 - w), dark = b * w, sum = lit + dark
    if (sum) {
      const t = dark / sum
      beam[i] += (shade[i] - beam[i]) * t
      beam[i + 1] += (shade[i + 1] - beam[i + 1]) * t
      beam[i + 2] += (shade[i + 2] - beam[i + 2]) * t
    }
    beam[i + 3] = sum / 255
  }
}

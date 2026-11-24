import { type CanvasFactory, type LayerCanvas } from './layerCache'
import type { Ctx2D } from '../paint/shared/base/hand'
import type { DeviceRect } from './paintJob'
import { MASK_TEXEL, type ShadowMask } from './shadowComposite'

interface Frame {
  canvas: LayerCanvas
  box: DeviceRect
  beam: CanvasImageSource
  shade: CanvasImageSource
  lightKey: string | null
  revision: number
  sy: number
  sampling: Sampling
}

const context = (canvas: LayerCanvas) => canvas.getContext('2d', { willReadFrequently: true }) as Ctx2D
const sameRect = (a: DeviceRect, b: DeviceRect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
const union = (a: DeviceRect, b: DeviceRect) => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

/** Blend affected receiver pixels and keep a single composited frame for each layer. */
export class ReceiverBlend {
  private frames = new Map<string, Frame>()
  private scratch?: LayerCanvas
  private readonly factory: CanvasFactory

  constructor(factory: CanvasFactory) { this.factory = factory }

  mix(id: string, lightKey: string | null, beam: CanvasImageSource, shade: CanvasImageSource,
    rect: DeviceRect, mask: ShadowMask, box: DeviceRect, sy: number) {
    const held = this.frames.get(id)
    const sameSource = held && held.lightKey === lightKey && held.beam === beam && held.shade === shade && held.sy === sy
    if (sameSource && held.revision === mask.revision) return held.canvas
    const canvas = held?.canvas.width === rect.w && held.canvas.height === rect.h ? held.canvas : this.factory(rect.w, rect.h)
    const { w, h } = box, x = box.x - rect.x, y = box.y - rect.y
    if (!this.scratch || this.scratch.width < w || this.scratch.height < h) {
      this.scratch = this.factory(Math.max(w, this.scratch?.width ?? 0), Math.max(h, this.scratch?.height ?? 0))
    }
    const output = context(canvas), scratch = context(this.scratch)
    const sameFrame = sameSource && held.canvas === canvas
    const restore = sameFrame ? union(held.box, box) : rect
    const rx = restore.x - rect.x, ry = restore.y - rect.y
    output.globalCompositeOperation = sameFrame ? 'source-over' : 'copy'
    if (sameFrame) output.clearRect(rx, ry, restore.w, restore.h)
    output.drawImage(beam, rx, sy + ry, restore.w, restore.h, rx, ry, restore.w, restore.h)
    scratch.globalCompositeOperation = 'copy'
    scratch.drawImage(shade, x, sy + y, w, h, 0, 0, w, h)
    const pixels = output.getImageData(x, y, w, h)
    const sampling = held && held.sampling.rect === mask.rect && sameRect(held.box, box) ? held.sampling : maskSampling(mask, box)
    blendPixels(pixels.data, scratch.getImageData(0, 0, w, h).data, mask.alpha, sampling)
    output.putImageData(pixels, x, y)
    this.frames.set(id, { canvas, box, beam, shade, lightKey, revision: mask.revision, sy, sampling })
    return canvas
  }

  invalidate(id: string) { this.frames.delete(id) }

  prune(keep: ReadonlySet<string>) {
    for (const id of this.frames.keys()) if (!keep.has(id)) this.frames.delete(id)
  }

  bytes() {
    let bytes = this.scratch ? this.scratch.width * this.scratch.height * 4 : 0
    for (const { canvas, sampling } of this.frames.values()) bytes += canvas.width * canvas.height * 4
      + (sampling.columns.indices.length + sampling.rows.indices.length) * 12
    return bytes
  }
}

function axis(size: number, offset: number, texel: number, limit: number, stride: number) {
  const indices = new Uint32Array(size), next = new Uint32Array(size), fractions = new Float32Array(size)
  const origin = (offset + 0.5) / texel - 0.5
  for (let p = 0; p < size; p++) {
    const v = Math.max(0, Math.min(origin + p / texel, limit - 1))
    const index = Math.floor(v)
    indices[p] = index * stride
    next[p] = Math.min(index + 1, limit - 1) * stride
    fractions[p] = v - index
  }
  return { indices, next, fractions }
}

function maskSampling({ rect, ratio, cols, rows }: ShadowMask, box: DeviceRect) {
  const texel = MASK_TEXEL * ratio
  return { rect, columns: axis(box.w, box.x - rect.x, texel, cols, 1),
    rows: axis(box.h, box.y - rect.y, texel, rows, cols) }
}

type Sampling = ReturnType<typeof maskSampling>

const LITTLE_ENDIAN = new Uint32Array(Uint8Array.of(1, 0, 0, 0).buffer)[0] === 1
const RED_BLUE = 0x00ff00ff

/** Equal coverage permits a rounded 8-bit interpolation. Red and blue occupy separate 16-bit lanes. */
function mixRgb(beam: number, shade: number, weight: number) {
  const lit = 255 - weight
  const rb = (beam & RED_BLUE) * lit + (shade & RED_BLUE) * weight + 0x00800080
  const g = (beam >>> 8 & 255) * lit + (shade >>> 8 & 255) * weight + 128
  // For channel numerators rounded to the nearest byte, division by 255 uses two shifts.
  return (beam & 0xff000000) | (((rb + (rb >>> 8 & RED_BLUE)) >>> 8) & RED_BLUE) | ((g + (g >>> 8)) & 0xff00)
}

/** Sum the weighted premultiplied colours (Canvas lighter), then return straight RGBA for ImageData. */
function blendPixels(beam: Uint8ClampedArray, shade: Uint8ClampedArray, alpha: Uint8Array, { columns, rows }: Sampling) {
  const width = columns.indices.length
  const litPixels = LITTLE_ENDIAN ? new Uint32Array(beam.buffer, beam.byteOffset, beam.byteLength / 4) : undefined
  const darkPixels = LITTLE_ENDIAN ? new Uint32Array(shade.buffer, shade.byteOffset, shade.byteLength / 4) : undefined
  for (let y = 0; y < rows.indices.length; y++) {
    const row = rows.indices[y], nextRow = rows.next[y], dy = rows.fractions[y]
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, a = beam[i + 3], b = shade[i + 3]
      if (!(a || b)) continue
      const column = columns.indices[x], nextColumn = columns.next[x], dx = columns.fractions[x]
      const tl = alpha[row + column], bl = alpha[nextRow + column]
      const top = tl + (alpha[row + nextColumn] - tl) * dx
      const bottom = bl + (alpha[nextRow + nextColumn] - bl) * dx
      const weight = Math.round(top + (bottom - top) * dy)
      if (!weight) continue
      if (a === b) {
        if (litPixels && darkPixels) {
          const p = i / 4
          litPixels[p] = mixRgb(litPixels[p], darkPixels[p], weight)
          continue
        }
        const t = weight * (1 / 255)
        beam[i] += (shade[i] - beam[i]) * t
        beam[i + 1] += (shade[i + 1] - beam[i + 1]) * t
        beam[i + 2] += (shade[i + 2] - beam[i + 2]) * t
        continue
      }
      const dark = b * weight, sum = a * (255 - weight) + dark
      if (sum) {
        const t = dark / sum
        beam[i] += (shade[i] - beam[i]) * t
        beam[i + 1] += (shade[i + 1] - beam[i + 1]) * t
        beam[i + 2] += (shade[i + 2] - beam[i + 2]) * t
      }
      beam[i + 3] = sum / 255
    }
  }
}

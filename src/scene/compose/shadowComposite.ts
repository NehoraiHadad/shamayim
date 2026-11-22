import { shadowAlphaTable, type ReceiverShadow } from '../model/planeCloudShadow'
import { ctxOf, type CanvasFactory, type LayerCanvas } from './layerCache'
import type { DeviceRect } from './paintJob'
const MASK_TEXEL = 2

interface Patch { canvas: LayerCanvas; box: DeviceRect; revision: number }
interface Mask {
  canvas: LayerCanvas
  image: ImageData
  ratio: number
  rect: DeviceRect
  shadow: ReceiverShadow
  alpha: Uint8Array
  depth: Float32Array
  seconds: number
  revision: number
  box?: DeviceRect
  poses: Map<number, Patch>
  beam?: CanvasImageSource
  shade?: CanvasImageSource
  paintKey?: string | null
  opaque?: boolean
}

export class ShadowComposite {
  private masks = new Map<string, Mask>()
  private tables = new WeakMap<ReceiverShadow, Uint8Array>()
  private tint?: LayerCanvas

  private readonly factory: CanvasFactory
  constructor(factory: CanvasFactory) {
    this.factory = factory
  }

  private maskAt(id: string, shadow: ReceiverShadow, rect: DeviceRect, dpr: number, seconds: number, step: number): Mask {
    const { x, y, w, h } = rect
    let mask = this.masks.get(id)
    const old = mask?.rect
    if (!mask || !old || mask.ratio !== dpr || old.x !== x || old.y !== y || old.w !== w || old.h !== h) {
      const cols = Math.ceil(w / dpr / MASK_TEXEL), rows = Math.ceil(h / dpr / MASK_TEXEL)
      const canvas = this.factory(cols, rows)
      const image = ctxOf(canvas).createImageData(cols, rows)
      mask = { canvas, image, rect, ratio: dpr, shadow, alpha: this.alphaOf(shadow), depth: new Float32Array(cols * rows),
        seconds: NaN, revision: 0, poses: new Map() }
      this.masks.set(id, mask)
    } else if (mask.shadow === shadow && mask.seconds === step) return mask
    if (mask.shadow !== shadow) {
      mask.shadow = shadow
      mask.alpha = this.alphaOf(shadow)
    }
    const { depth, alpha, image, canvas } = mask
    const { width, height, data } = image
    depth.fill(0)
    for (const blob of shadow.blobs) {
      const bx = (blob.x + blob.speed * seconds - x / dpr) / MASK_TEXEL - 0.5
      const by = (blob.y - y / dpr) / MASK_TEXEL - 0.5
      const rx = blob.rx / MASK_TEXEL, ry = blob.ry / MASK_TEXEL
      const from = Math.max(0, Math.ceil(bx - rx)), to = Math.min(width - 1, Math.floor(bx + rx))
      const top = Math.max(0, Math.ceil(by - ry)), bottom = Math.min(height - 1, Math.floor(by + ry))
      for (let j = top; j <= bottom; j++) {
        const dy = (j - by) / ry, chord = 1 - dy * dy
        for (let i = from; i <= to; i++) {
          const dx = (i - bx) / rx, edge = chord - dx * dx
          if (edge > 0) depth[j * width + i] += blob.opticalDepth * edge * edge
        }
      }
    }
    let left = width, right = -1, top = height, bottom = -1
    for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
      const o = j * width + i
      const a = alpha[Math.min(alpha.length - 1, Math.round(depth[o] * 64))]
      data[o * 4 + 3] = a
      if (a) {
        left = Math.min(left, i); right = Math.max(right, i)
        top = Math.min(top, j); bottom = Math.max(bottom, j)
      }
    }
    mask.box = undefined
    if (right >= left) {
      ctxOf(canvas).putImageData(image, 0, 0)
      const texel = MASK_TEXEL * dpr
      // Keep one filtered texel around the positive alpha extent.
      const px = Math.max(0, Math.floor((left - 1) * texel)), py = Math.max(0, Math.floor((top - 1) * texel))
      mask.box = { x: px, y: py, w: Math.min(w, Math.ceil((right + 2) * texel)) - px,
        h: Math.min(h, Math.ceil((bottom + 2) * texel)) - py }
    }
    mask.seconds = step
    mask.revision++
    return mask
  }

  private alphaOf(shadow: ReceiverShadow) {
    let table = this.tables.get(shadow)
    if (!table) this.tables.set(shadow, table = shadowAlphaTable(shadow))
    return table
  }

  prune(keep: ReadonlySet<string>) {
    for (const id of this.masks.keys()) if (!keep.has(id + '.shade')) this.masks.delete(id)
  }

  bytes() {
    let bytes = this.tint ? this.tint.width * this.tint.height * 4 : 0
    for (const { canvas, image, depth, poses } of this.masks.values()) {
      bytes += canvas.width * canvas.height * 4 + image.data.byteLength + depth.byteLength
      for (const { canvas } of poses.values()) bytes += canvas.width * canvas.height * 4
    }
    return bytes
  }

  /** Mix only the mask's nontransparent area. Reuse gust patches while the mask pixel stays put. */
  blend(id: string, paintKey: string | null, beam: CanvasImageSource, shade: CanvasImageSource, shadow: ReceiverShadow,
    rect: DeviceRect, ratio: number, seconds: number, sy: number, opaque: boolean, step?: number): Patch | undefined {
    const mask = this.maskAt(id, shadow, rect, ratio, seconds, step ?? -seconds - 0.5)
    const box = mask.box
    if (!box) return
    if (mask.beam !== beam || mask.shade !== shade || mask.paintKey !== paintKey || mask.opaque !== opaque) {
      mask.revision++
      mask.beam = beam; mask.shade = shade; mask.paintKey = paintKey; mask.opaque = opaque
    }
    const held = mask.poses.get(sy)
    if (held?.revision === mask.revision) return held
    const { x, y, w, h } = box
    const canvas = held && held.canvas.width >= w && held.canvas.height >= h
      ? held.canvas : this.factory(w, h)
    if (!opaque && (!this.tint || this.tint.width < w || this.tint.height < h)) {
      this.tint = this.factory(Math.max(w, this.tint?.width ?? 0), Math.max(h, this.tint?.height ?? 0))
    }
    const fill = ctxOf(opaque ? canvas : this.tint!)
    const maskW = mask.canvas.width * MASK_TEXEL * ratio, maskH = mask.canvas.height * MASK_TEXEL * ratio
    fill.globalCompositeOperation = 'source-over'
    fill.clearRect(0, 0, w, h)
    fill.drawImage(shade, x, sy + y, w, h, 0, 0, w, h)
    fill.globalCompositeOperation = 'destination-in'
    fill.drawImage(mask.canvas as CanvasImageSource, -x, -y, maskW, maskH)
    if (!opaque) {
      const base = ctxOf(canvas)
      base.globalCompositeOperation = 'source-over'
      base.clearRect(0, 0, w, h)
      base.drawImage(beam, x, sy + y, w, h, 0, 0, w, h)
      base.globalCompositeOperation = 'destination-out'
      base.drawImage(mask.canvas as CanvasImageSource, -x, -y, maskW, maskH)
      base.globalCompositeOperation = 'lighter'
      base.drawImage(this.tint as CanvasImageSource, 0, 0, w, h, 0, 0, w, h)
    }
    const patch = { canvas, box, revision: mask.revision }
    mask.poses.set(sy, patch)
    return patch
  }
}

import { shadowAlphaTable, type ReceiverShadow } from '../model/planeCloudShadow'
import { ctxOf, type CanvasFactory, type LayerCanvas } from './layerCache'
import type { DeviceRect } from './paintJob'

const MASK_TEXEL = 2

interface Mask {
  canvas: LayerCanvas
  image: ImageData
  ratio: number
  rect: DeviceRect
  shadow: ReceiverShadow
  alpha: Uint8Array
  depth: Float32Array
  seconds: number
  visible: boolean
  mixed?: { canvas: LayerCanvas; beam: CanvasImageSource; shade: CanvasImageSource; paintKey: string | null; sy: number }
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
        seconds: NaN, visible: false }
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
    let visible = false
    for (let i = 0; i < depth.length; i++) {
      const a = alpha[Math.min(alpha.length - 1, Math.round(depth[i] * 64))]
      data[i * 4 + 3] = a
      visible ||= a > 0
    }
    if (visible) ctxOf(canvas).putImageData(image, 0, 0)
    mask.seconds = step
    if (mask.mixed) mask.mixed.sy = -1
    mask.visible = visible
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
    for (const { canvas, image, depth, mixed } of this.masks.values()) {
      bytes += canvas.width * canvas.height * 4 + image.data.byteLength + depth.byteLength
      if (mixed) bytes += mixed.canvas.width * mixed.canvas.height * 4
    }
    return bytes
  }

  /** Interpolate premultiplied endpoint pixels so partially covered crowns and crests keep their original alpha. */
  blend(id: string, paintKey: string | null, beam: CanvasImageSource, shade: CanvasImageSource, shadow: ReceiverShadow,
    rect: DeviceRect, ratio: number, seconds: number, sy: number, step?: number): CanvasImageSource | undefined {
    const mask = this.maskAt(id, shadow, rect, ratio, seconds, step ?? -seconds - 0.5)
    if (!mask.visible) return
    const { w, h } = rect
    const current = mask.mixed
    if (current?.beam === beam && current.shade === shade && current.paintKey === paintKey && current.sy === sy) return current.canvas as CanvasImageSource
    const canvas = current?.canvas ?? this.factory(w, h)
    mask.mixed = { canvas, beam, shade, paintKey, sy }
    if (!this.tint || this.tint.width < w || this.tint.height < h) {
      this.tint = this.factory(Math.max(w, this.tint?.width ?? 0), Math.max(h, this.tint?.height ?? 0))
    }
    const base = ctxOf(canvas), fill = ctxOf(this.tint)
    const maskW = mask.canvas.width * MASK_TEXEL * ratio, maskH = mask.canvas.height * MASK_TEXEL * ratio
    base.globalCompositeOperation = 'source-over'
    base.clearRect(0, 0, w, h)
    base.drawImage(beam, 0, sy, w, h, 0, 0, w, h)
    base.globalCompositeOperation = 'destination-out'
    base.drawImage(mask.canvas as CanvasImageSource, 0, 0, maskW, maskH)
    fill.globalCompositeOperation = 'source-over'
    fill.clearRect(0, 0, w, h)
    fill.drawImage(shade, 0, sy, w, h, 0, 0, w, h)
    fill.globalCompositeOperation = 'destination-in'
    fill.drawImage(mask.canvas as CanvasImageSource, 0, 0, maskW, maskH)
    base.globalCompositeOperation = 'lighter'
    base.drawImage(this.tint as CanvasImageSource, 0, 0, w, h, 0, 0, w, h)
    return canvas as CanvasImageSource
  }
}

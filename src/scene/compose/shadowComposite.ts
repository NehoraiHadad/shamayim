import { shadowAlphaTable, type ReceiverShadow } from '../model/planeCloudShadow'
import { ctxOf, type CanvasFactory, type LayerCanvas } from './layerCache'
import type { DeviceRect } from './paintJob'

const MASK_TEXEL = 2

interface Mask {
  canvas: LayerCanvas
  image: ImageData
  alpha: Uint8Array
  depth: Float32Array
  seconds: number
  visible: boolean
}

export class ShadowComposite {
  private masks = new WeakMap<DeviceRect, { shadow: ReceiverShadow; mask: Mask }>()
  private tables = new WeakMap<ReceiverShadow, Uint8Array>()
  private mixed?: LayerCanvas
  private tint?: LayerCanvas

  private readonly factory: CanvasFactory

  constructor(factory: CanvasFactory) {
    this.factory = factory
  }

  private maskAt(shadow: ReceiverShadow, rect: DeviceRect, dpr: number, seconds: number): Mask {
    const { x, y, w, h } = rect
    const held = this.masks.get(rect)
    let mask = held?.mask
    if (!mask) {
      const cols = Math.ceil(w / dpr / MASK_TEXEL), rows = Math.ceil(h / dpr / MASK_TEXEL)
      const canvas = this.factory(cols, rows)
      const image = ctxOf(canvas).createImageData(cols, rows)
      mask = { canvas, image, alpha: new Uint8Array(), depth: new Float32Array(cols * rows), seconds: NaN, visible: false }
    } else if (held?.shadow === shadow && mask.seconds === seconds) return mask
    if (held?.shadow !== shadow) {
      let table = this.tables.get(shadow)
      if (!table) this.tables.set(shadow, table = shadowAlphaTable(shadow))
      mask.alpha = table
      this.masks.set(rect, { shadow, mask })
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
    mask.seconds = seconds
    mask.visible = visible
    return mask
  }

  bytes() {
    return this.mixed ? this.mixed.width * this.mixed.height * 8 : 0
  }

  /** Interpolate premultiplied endpoint pixels so partially covered crowns and crests keep their original alpha. */
  blend(beam: CanvasImageSource, shade: CanvasImageSource, shadow: ReceiverShadow, rect: DeviceRect,
    ratio: number, seconds: number, sy: number): CanvasImageSource | undefined {
    const mask = this.maskAt(shadow, rect, ratio, seconds)
    if (!mask.visible) return
    const { w, h } = rect
    if (!this.mixed || this.mixed.width < w || this.mixed.height < h) {
      const width = Math.max(w, this.mixed?.width ?? 0), height = Math.max(h, this.mixed?.height ?? 0)
      this.mixed = this.factory(width, height)
      this.tint = this.factory(width, height)
    }
    const base = ctxOf(this.mixed), fill = ctxOf(this.tint!)
    const maskW = mask.canvas.width * MASK_TEXEL * ratio, maskH = mask.canvas.height * MASK_TEXEL * ratio
    base.globalCompositeOperation = 'copy'
    base.drawImage(beam, 0, sy, w, h, 0, 0, w, h)
    base.globalCompositeOperation = 'destination-out'
    base.drawImage(mask.canvas as CanvasImageSource, 0, 0, maskW, maskH)
    fill.globalCompositeOperation = 'copy'
    fill.drawImage(mask.canvas as CanvasImageSource, 0, 0, maskW, maskH)
    fill.globalCompositeOperation = 'source-in'
    fill.drawImage(shade, 0, sy, w, h, 0, 0, w, h)
    base.globalCompositeOperation = 'lighter'
    base.drawImage(this.tint as CanvasImageSource, 0, 0, w, h, 0, 0, w, h)
    return this.mixed as CanvasImageSource
  }
}

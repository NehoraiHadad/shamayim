import { shadowAlphaTable, type ReceiverShadow } from '../model/planeCloudShadow'
import { ctxOf, type CanvasFactory, type LayerCanvas } from './layerCache'
import type { DeviceRect } from './paintJob'

export const MASK_TEXEL = 2

interface Mask {
  canvas: LayerCanvas
  image: ImageData
  ratio: number
  rect: DeviceRect
  shadow?: ReceiverShadow
  depth: Float32Array
  step?: number
  revision: number
  box?: DeviceRect
}

export function intersect(a: DeviceRect, b: DeviceRect): DeviceRect | undefined {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y)
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y
  if (w > 0 && h > 0) return { x, y, w, h }
}

/** One 2-CSS-px optical-depth raster per plane, in the land surface's coordinates. */
export class ShadowComposite {
  private masks = new Map<string, Mask>()
  private tables = new WeakMap<ReceiverShadow, Uint8Array>()
  private revision = 0

  private readonly factory: CanvasFactory
  constructor(factory: CanvasFactory) { this.factory = factory }

  maskAt(id: string, shadow: ReceiverShadow, rect: DeviceRect, ratio: number, seconds: number, step: number): Mask {
    const { x, y, w, h } = rect
    let mask = this.masks.get(id)
    const old = mask?.rect
    const texel = ratio * MASK_TEXEL
    if (!mask || !old || mask.ratio !== ratio || old.x !== x || old.y !== y || old.w !== w || old.h !== h) {
      const cols = Math.ceil(w / texel), rows = Math.ceil(h / texel)
      const canvas = this.factory(cols, rows)
      const image = ctxOf(canvas).createImageData(cols, rows)
      mask = { canvas, image, rect, ratio, depth: new Float32Array(cols * rows), revision: 0 }
      this.masks.set(id, mask)
    } else if (mask.shadow === shadow && mask.step === step) return mask

    let alpha = this.tables.get(shadow)
    if (!alpha) this.tables.set(shadow, alpha = shadowAlphaTable(shadow))
    const { width, height, data } = mask.image
    const blobs = shadow.blobs.map((blob) => {
      const bx = (blob.x + blob.speed * seconds) / MASK_TEXEL - x / texel - 0.5
      const by = blob.y / MASK_TEXEL - y / texel - 0.5
      const rx = blob.rx / MASK_TEXEL, ry = blob.ry / MASK_TEXEL
      const left = Math.max(0, Math.ceil(bx - rx)), right = Math.min(width - 1, Math.floor(bx + rx))
      const top = Math.max(0, Math.ceil(by - ry)), bottom = Math.min(height - 1, Math.floor(by + ry))
      return { bx, by, rx, ry, left, right, top, bottom, tau: blob.opticalDepth }
    })
    let left = width, right = -1, top = height, bottom = -1
    for (const b of blobs) {
      if (b.left > b.right || b.top > b.bottom) continue
      left = Math.min(left, b.left); right = Math.max(right, b.right)
      top = Math.min(top, b.top); bottom = Math.max(bottom, b.bottom)
    }
    const ctx = ctxOf(mask.canvas)
    if (mask.box) {
      // Clear the preceding footprint, including where the new blobs have moved away.
      const { x: bx, y: by, w: bw, h: bh } = mask.box
      const px = Math.floor((bx - x) / texel), py = Math.floor((by - y) / texel)
      ctx.clearRect(px, py, Math.ceil((bx + bw - x) / texel) - px, Math.ceil((by + bh - y) / texel) - py)
    }
    mask.box = undefined
    const depth = mask.depth
    for (let j = top; j <= bottom; j++) depth.fill(0, j * width + left, j * width + right + 1)
    for (const b of blobs) {
      for (let j = b.top; j <= b.bottom; j++) {
        const dy = (j - b.by) / b.ry, chord = 1 - dy * dy
        for (let i = b.left; i <= b.right; i++) {
          const dx = (i - b.bx) / b.rx, edge = chord - dx * dx
          if (edge > 0) depth[j * width + i] += b.tau * edge * edge
        }
      }
    }
    let x0 = width, x1 = -1, y0 = height, y1 = -1
    for (let j = top; j <= bottom; j++) for (let i = left; i <= right; i++) {
      const o = j * width + i
      const a = alpha[Math.min(alpha.length - 1, Math.round(depth[o] * 64))]
      data[o * 4 + 3] = a
      if (a) {
        x0 = Math.min(x0, i); x1 = Math.max(x1, i)
        y0 = Math.min(y0, j); y1 = Math.max(y1, j)
      }
    }
    if (x1 >= x0) {
      ctx.putImageData(mask.image, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1)
      // Include one texel around the active area for bilinear filtering at the edge.
      const px = Math.max(0, Math.floor((x0 - 1) * texel)), py = Math.max(0, Math.floor((y0 - 1) * texel))
      mask.box = { x: x + px, y: y + py, w: Math.min(w, Math.ceil((x1 + 2) * texel)) - px,
        h: Math.min(h, Math.ceil((y1 + 2) * texel)) - py }
    }
    mask.shadow = shadow
    mask.step = step
    mask.revision = ++this.revision
    return mask
  }

  prune(keep: ReadonlySet<string>) {
    for (const id of this.masks.keys()) if (!keep.has(id)) this.masks.delete(id)
  }

  bytes() {
    let bytes = 0
    for (const { canvas, image, depth } of this.masks.values()) bytes += canvas.width * canvas.height * 4 + image.data.byteLength + depth.byteLength
    return bytes
  }
}

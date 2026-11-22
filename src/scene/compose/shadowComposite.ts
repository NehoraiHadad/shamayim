import { shadowAlphaTable, type ReceiverShadow } from '../model/planeCloudShadow'
import type { DeviceRect } from './paintJob'

export const MASK_TEXEL = 2
const MAX_TABLES = 32

export interface ShadowMask {
  cols: number
  rows: number
  alpha: Uint8Array
  ratio: number
  rect: DeviceRect
  key?: string
  depth: Float32Array
  step?: number
  revision: number
  box?: DeviceRect
  active?: DeviceRect
}

export function intersect(a: DeviceRect, b: DeviceRect): DeviceRect | undefined {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y)
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y
  if (w > 0 && h > 0) return { x, y, w, h }
}

function shadowKeys(shadow: ReceiverShadow) {
  const exposure = [shadow.open, shadow.beamOverSky, shadow.skyDisplay, shadow.hazeShare, shadow.hazeY]
    .map((value) => Number(value.toPrecision(5)))
  const alphaKey = exposure.join(',')
  const footprints = shadow.blobs.map(({ x, y, rx, ry, speed, opticalDepth }) => [x, y, rx, ry, speed, opticalDepth].join(','))
  return { alphaKey, key: [alphaKey, shadow.from, shadow.speed, ...footprints].join(';'), exposure }
}

/** One 2-CSS-px optical-depth raster per plane, in the land surface's coordinates. */
export class ShadowComposite {
  private masks = new Map<string, ShadowMask>()
  private tables = new Map<string, Uint8Array>()
  private keys = new WeakMap<ReceiverShadow, ReturnType<typeof shadowKeys>>()
  private revision = 0

  maskAt(id: string, shadow: ReceiverShadow, rect: DeviceRect, ratio: number, seconds: number, step: number): ShadowMask {
    let keys = this.keys.get(shadow)
    if (!keys) this.keys.set(shadow, keys = shadowKeys(shadow))
    const { x, y, w, h } = rect
    let mask = this.masks.get(id)
    const old = mask?.rect
    const texel = ratio * MASK_TEXEL
    if (!mask || !old || mask.ratio !== ratio || old.x !== x || old.y !== y || old.w !== w || old.h !== h) {
      const cols = Math.ceil(w / texel), rows = Math.ceil(h / texel)
      mask = { cols, rows, alpha: new Uint8Array(cols * rows), rect, ratio, depth: new Float32Array(cols * rows), revision: 0 }
      this.masks.set(id, mask)
    } else if (mask.key === keys.key && mask.step === step) return mask

    let table = this.tables.get(keys.alphaKey)
    if (!table) {
      const [open, beamOverSky, skyDisplay, hazeShare, hazeY] = keys.exposure
      if (this.tables.size >= MAX_TABLES) this.tables.delete(this.tables.keys().next().value!)
      this.tables.set(keys.alphaKey, table = shadowAlphaTable({ open, beamOverSky, skyDisplay, hazeShare, hazeY }))
    }
    const { cols: width, rows: height, alpha, depth } = mask
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
    if (mask.active) {
      const { x: ax, y: ay, w: aw, h: ah } = mask.active
      for (let j = ay; j < ay + ah; j++) alpha.fill(0, j * width + ax, j * width + ax + aw)
    }
    mask.box = undefined
    mask.active = undefined
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
      const a = table[Math.min(table.length - 1, Math.round(depth[o] * 64))]
      alpha[o] = a
      if (a) {
        x0 = Math.min(x0, i); x1 = Math.max(x1, i)
        y0 = Math.min(y0, j); y1 = Math.max(y1, j)
      }
    }
    if (x1 >= x0) {
      mask.active = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
      // Include one texel around the active area for bilinear filtering at the edge.
      const px = Math.max(0, Math.floor((x0 - 1) * texel)), py = Math.max(0, Math.floor((y0 - 1) * texel))
      mask.box = { x: x + px, y: y + py, w: Math.min(w, Math.ceil((x1 + 2) * texel)) - px,
        h: Math.min(h, Math.ceil((y1 + 2) * texel)) - py }
    }
    mask.key = keys.key
    mask.step = step
    mask.revision = ++this.revision
    return mask
  }

  prune(keep: ReadonlySet<string>) {
    for (const id of this.masks.keys()) if (!keep.has(id)) this.masks.delete(id)
  }

  bytes() {
    let bytes = 0
    for (const table of this.tables.values()) bytes += table.byteLength
    for (const { alpha, depth } of this.masks.values()) bytes += alpha.byteLength + depth.byteLength
    return bytes
  }
}

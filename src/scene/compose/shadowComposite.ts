import { shadowAlphaTable, SHADOW_DEPTH_STEPS, type ReceiverShadow } from '../model/planeCloudShadow'
import { prepareShadowStamp } from './cloudShadowStamp'
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
  stamps?: ReturnType<typeof prepareShadowStamp>[]
  first: Int32Array
  last: Int32Array
}

export function intersect(a: DeviceRect, b: DeviceRect): DeviceRect | undefined {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y)
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y
  if (w > 0 && h > 0) return { x, y, w, h }
}

function shadowKeys(shadow: ReceiverShadow) {
  const exposure = [shadow.open, shadow.beamOverSky, shadow.skyDisplay, shadow.hazeShare, shadow.hazeY,
    shadow.neutralBeam ?? 0, shadow.coreDiffuse ?? 0]
    .map((value) => Number(value.toPrecision(5)))
  const alphaKey = exposure.join(',')
  const footprints = shadow.blobs.map(({ x, y, rx, ry, speed, opticalDepth, edge }) =>
    [x, y, rx, ry, speed, opticalDepth, edge?.centre, edge?.widthX, edge?.widthY, edge?.lobes.join(',')].join(','))
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
      mask = { cols, rows, alpha: new Uint8Array(cols * rows), rect, ratio, depth: new Float32Array(cols * rows), revision: 0,
        first: new Int32Array(rows).fill(cols), last: new Int32Array(rows).fill(-1) }
      this.masks.set(id, mask)
    } else if (mask.key === keys.key && mask.step === step) return mask

    let table = this.tables.get(keys.alphaKey)
    if (!table) {
      const [open, beamOverSky, skyDisplay, hazeShare, hazeY, neutralBeam, coreDiffuse] = keys.exposure
      if (this.tables.size >= MAX_TABLES) this.tables.delete(this.tables.keys().next().value!)
      this.tables.set(keys.alphaKey, table = shadowAlphaTable({ open, beamOverSky, skyDisplay, hazeShare, hazeY, neutralBeam, coreDiffuse }))
    }
    const { cols: width, rows: height, alpha, depth, first: rowFirst, last: rowLast } = mask
    if (!mask.stamps || mask.key !== keys.key) {
      mask.stamps = shadow.blobs.map((blob) => prepareShadowStamp(blob, rect, ratio, MASK_TEXEL))
    }
    for (let j = 0; j < height; j++) {
      const first = rowFirst[j], last = rowLast[j]
      if (first > last) continue
      const start = j * width + first, end = j * width + last + 1
      depth.fill(0, start, end)
      alpha.fill(0, start, end)
      rowFirst[j] = width; rowLast[j] = -1
    }
    mask.box = undefined
    mask.active = undefined
    const origin = x / ratio
    for (const s of mask.stamps) {
      const shift = (s.x + s.speed * seconds - origin) / MASK_TEXEL - .5
      const whole = Math.floor(shift), frac = shift - whole, offset = s.first + whole
      if (offset >= width || s.last + whole + 1 < 0) continue
      for (let j = s.top; j <= s.bottom; j++) {
        const index = j - s.top, row = index * s.width, dest = j * width
        const head = s.spans[index * 2], tail = s.spans[index * 2 + 1]
        if (head > tail) continue
        const start = offset + head, end = offset + tail + 1
        if (start >= width || end < 0) continue
        rowFirst[j] = Math.min(rowFirst[j], Math.max(0, start))
        rowLast[j] = Math.max(rowLast[j], Math.min(width - 1, end))
        const first = Math.max(0, start + 1), last = Math.min(width - 1, end - 1)
        if (start >= 0) depth[dest + start] += s.data[row + head] * (1 - frac)
        for (let i = first, o = row + first - offset; i <= last; i++, o++) {
          const t = s.data[o]
          depth[dest + i] += t + (s.data[o - 1] - t) * frac
        }
        if (end < width) depth[dest + end] += s.data[row + tail] * frac
      }
    }
    let x0 = width, x1 = -1, y0 = height, y1 = -1
    const lastBin = table.length - 1, saturated = table[lastBin]
    for (let j = 0; j < height; j++) {
      const row = j * width
      let litFirst = width, litLast = -1
      for (let i = rowFirst[j]; i <= rowLast[j]; i++) {
        const o = row + i, bin = depth[o] * SHADOW_DEPTH_STEPS + .5
        const a = bin >= lastBin ? saturated : table[bin | 0]
        if (!a) continue
        alpha[o] = a
        if (litLast < 0) litFirst = i
        litLast = i
      }
      if (litLast >= 0) {
        x0 = Math.min(x0, litFirst); x1 = Math.max(x1, litLast)
        if (y1 < 0) y0 = j
        y1 = j
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
    for (const { alpha, depth, first, last, stamps } of this.masks.values()) {
      bytes += alpha.byteLength + depth.byteLength + first.byteLength + last.byteLength
      if (stamps) for (const { data, spans } of stamps) bytes += data.byteLength + spans.byteLength
    }
    return bytes
  }
}

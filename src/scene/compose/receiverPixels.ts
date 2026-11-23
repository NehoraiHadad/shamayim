import type { Ctx2D } from '../paint/shared/base/hand'
import type { CanvasFactory, LayerCanvas } from './layerCache'
import type { DeviceRect } from './paintJob'

export const readContext = (canvas: LayerCanvas) => canvas.getContext('2d', { willReadFrequently: true }) as Ctx2D

interface Source {
  crops: Map<string, ImageData>
  users: number
}

/** Straight RGBA after one 1:1 copy into a CPU canvas, matching the original endpoint reads. */
export class ReceiverPixels {
  private readonly sources = new WeakMap<CanvasImageSource, Source>()
  private readonly recent = new Map<ImageData, () => void>()
  private readonly factory: CanvasFactory
  private readonly limit: number
  private scratch?: LayerCanvas
  private retained = 0

  constructor(factory: CanvasFactory, limit: number) {
    this.factory = factory
    this.limit = limit
  }

  retain(source: CanvasImageSource) {
    const held = this.sources.get(source)
    if (held) held.users++
    else this.sources.set(source, { crops: new Map(), users: 1 })
  }

  release(source: CanvasImageSource) {
    const held = this.sources.get(source)!
    if (--held.users) return
    for (const image of held.crops.values()) this.recent.get(image)!()
    this.sources.delete(source)
  }

  read(source: CanvasImageSource, { x, y, w, h }: DeviceRect): ImageData {
    const entries = this.sources.get(source)!.crops
    const key = [x, y, w, h].join(',')
    const cached = entries.get(key)
    if (cached) {
      const drop = this.recent.get(cached)!
      this.recent.delete(cached)
      this.recent.set(cached, drop)
      return cached
    }

    const size = w * h * 4
    if (size <= this.limit) {
      for (const drop of this.recent.values()) {
        if (this.retained + size <= this.limit) break
        drop()
      }
    }
    const image = this.readCrop(source, x, y, w, h)
    if (size <= this.limit) {
      entries.set(key, image)
      this.retained += size
      this.recent.set(image, () => {
        entries.delete(key)
        this.recent.delete(image)
        this.retained -= size
      })
    }
    return image
  }

  private readCrop(source: CanvasImageSource, x: number, y: number, w: number, h: number) {
    const canvas = this.scratch ??= this.factory(w, h)
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    const scratch = readContext(canvas)
    try {
      scratch.globalCompositeOperation = 'copy'
      scratch.drawImage(source, x, y, w, h, 0, 0, w, h)
      return scratch.getImageData(0, 0, w, h)
    } finally {
      // Retain the canvas object without keeping a second backing store.
      canvas.width = canvas.height = 0
    }
  }

  bytes() { return this.retained }
}

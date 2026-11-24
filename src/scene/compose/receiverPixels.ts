import type { Ctx2D } from '../paint/shared/base/hand'
import type { CanvasFactory, LayerCanvas } from './layerCache'
import type { DeviceRect } from './paintJob'

export const cpuContext = (canvas: LayerCanvas) => canvas.getContext('2d', { willReadFrequently: true }) as Ctx2D

interface Source {
  crops: Map<string, ImageData>
  users: number
}

/** Straight RGBA after one 1:1 copy into a CPU canvas, matching the original endpoint reads. */
export class ReceiverPixels {
  private readonly sources = new WeakMap<CanvasImageSource, Source>()
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
    for (const image of held.crops.values()) this.retained -= image.data.byteLength
    this.sources.delete(source)
  }

  readCached(source: CanvasImageSource, { x, y, w, h }: DeviceRect): ImageData | undefined {
    const entries = this.sources.get(source)!.crops
    const key = [x, y, w, h].join(',')
    const cached = entries.get(key)
    if (cached) return cached

    const size = w * h * 4
    if (this.retained + size > this.limit) return
    const image = this.readBox(source, { x, y, w, h })
    entries.set(key, image)
    this.retained += size
    return image
  }

  readBox(source: CanvasImageSource, { x, y, w, h }: DeviceRect) {
    const canvas = this.scratch ??= this.factory(w, h)
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    const scratch = cpuContext(canvas)
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

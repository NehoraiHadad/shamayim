import { expect, it, vi } from 'vitest'
import type { LayerCanvas } from './layerCache'
import { ReceiverBlend } from './receiverBlend'
import { ReceiverPixels } from './receiverPixels'

const source = () => ({}) as ImageBitmap
const rect = { x: 0, y: 0, w: 4, h: 3 }
const box = { ...rect, w: 2 }
const mask = (revision: number) => ({ rect, ratio: 1, cols: 2, rows: 2, alpha: new Uint8Array(4),
  depth: new Float32Array(4), first: new Int32Array(2), last: new Int32Array(2), revision })

function fakeCanvasFactory() {
  const image = (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })
  const draw = vi.fn()
  const read = vi.fn(image)
  const put = vi.fn()
  const factory = (width: number, height: number) => ({
    width, height, getContext: () => ({
      drawImage: draw, clearRect: vi.fn(), getImageData: (_x: number, _y: number, w: number, h: number) => read(w, h),
      createImageData: image, putImageData: put,
    }),
  }) as unknown as LayerCanvas
  return { factory, draw, read, put }
}

it.each(['strip', 'worker bitmaps'] as const)('reads each endpoint pose once across three %s cycles', (mode) => {
  const { factory, draw, read, put } = fakeCanvasFactory()
  const blend = new ReceiverBlend(factory)
  const first = [source(), source()] as const
  const pairs = mode === 'strip' ? [first, first, first] : [first, [source(), source()], [source(), source()]]
  const sources = mode === 'strip' ? undefined : pairs.flat()
  let revision = 0
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const [pose, [beam, shade]] of pairs.entries()) {
      const sy = mode === 'strip' ? pose * rect.h : 0
      for (let step = 0; step < 4; step++) blend.mix('layer', null, beam, shade, rect, mask(++revision), box, sy, sources)
    }
  }
  expect(read).toHaveBeenCalledTimes(6)
  expect(draw).toHaveBeenCalledTimes(6)
  expect(put).toHaveBeenCalledTimes(revision)
  const before = blend.bytes()
  blend.mix('layer', null, source(), source(), rect, mask(++revision), box, 0)
  expect(read).toHaveBeenCalledTimes(8)
  expect(blend.bytes()).toBe(before - 4 * rect.w * rect.h * 4)
  blend.prune(new Set())
  expect(blend.bytes()).toBe(0)
})

it('retains crops until the last frame using an endpoint goes', () => {
  const { factory, read } = fakeCanvasFactory()
  const blend = new ReceiverBlend(factory)
  const beam = source(), shade = source(), replacement = source()
  blend.mix('first', null, beam, shade, rect, mask(0), box, 0)
  blend.mix('second', null, shade, beam, rect, mask(0), box, 0)
  blend.invalidate('first')
  blend.mix('second', null, shade, replacement, rect, mask(1), box, 0)
  expect(read).toHaveBeenCalledTimes(3)
  blend.mix('second', null, shade, beam, rect, mask(2), box, 0)
  expect(read).toHaveBeenCalledTimes(4)
  blend.invalidate('second')
  expect(blend.bytes()).toBe(0)
})

it('evicts the least recently used crop and bounds retained bytes', () => {
  const { factory, read } = fakeCanvasFactory()
  const size = rect.w * rect.h * 4
  const pixels = new ReceiverPixels(factory, 2 * size)
  const bitmap = source()
  pixels.retain(bitmap)
  const pose = (index: number) => pixels.read(bitmap, { ...rect, y: index * rect.h })
  const first = pose(0), second = pose(1)
  expect(pose(0)).toBe(first)
  pose(2)
  expect(pixels.bytes()).toBe(2 * size)
  expect(pose(0)).toBe(first)
  expect(pose(1)).not.toBe(second)
  expect(read).toHaveBeenCalledTimes(4)
  pixels.read(bitmap, { ...rect, h: 3 * rect.h })
  expect(pixels.bytes()).toBe(2 * size)
  pixels.release(bitmap)
  expect(pixels.bytes()).toBe(0)
})

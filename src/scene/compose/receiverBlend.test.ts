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
  const create = vi.fn(image)
  const factory = (width: number, height: number) => ({
    width, height, getContext: () => ({
      drawImage: draw, clearRect: vi.fn(), getImageData: (_x: number, _y: number, w: number, h: number) => read(w, h),
      createImageData: create, putImageData: put,
    }),
  }) as unknown as LayerCanvas
  return { factory, draw, read, put, create }
}

it.each(['strip', 'worker bitmaps'] as const)('reads each endpoint pose once across three %s cycles', (mode) => {
  const { factory, draw, read, put } = fakeCanvasFactory()
  const blend = new ReceiverBlend(factory)
  const first = [source(), source()] as const
  const pairs = mode === 'strip' ? [first, first, first] : [first, [source(), source()], [source(), source()]]
  const sources = mode === 'strip' ? undefined : pairs.map(([bitmap, shade]) => ({ bitmap, shade }))
  let revision = 0
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const [pose, [beam, shade]] of pairs.entries()) {
      const sy = mode === 'strip' ? pose * rect.h : 0
      for (let step = 0; step < 4; step++) {
        blend.mix('layer', null, beam, shade, rect, mask(++revision), box, sy, sources, ...first)
      }
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

it('misses only the unadmitted crop per cycle and admits it when a source is released', () => {
  const { factory, read } = fakeCanvasFactory()
  const size = rect.w * rect.h * 4
  const pixels = new ReceiverPixels(factory, 2 * size)
  const bitmaps = [source(), source(), source()]
  for (const bitmap of bitmaps) pixels.retain(bitmap)
  for (let cycle = 0; cycle < 3; cycle++) {
    read.mockClear()
    for (const bitmap of bitmaps) {
      if (!pixels.readCached(bitmap, rect)) pixels.readBox(bitmap, box)
    }
    expect(read).toHaveBeenCalledTimes(cycle === 0 ? 3 : 1)
    expect(read).toHaveBeenLastCalledWith(box.w, box.h)
    expect(pixels.bytes()).toBe(2 * size)
  }
  pixels.release(bitmaps[0])
  expect(pixels.readCached(bitmaps[2], rect)).toBeDefined()
  for (const bitmap of bitmaps.slice(1)) pixels.release(bitmap)
  expect(pixels.bytes()).toBe(0)
})

it.each([0, rect.w * rect.h * 4])('reads only the box for endpoints denied by a %i-byte cap', limit => {
  const { factory, draw, read, create } = fakeCanvasFactory()
  const blend = new ReceiverBlend(factory, limit)
  const beam = source(), shade = source()
  for (let i = 0; i < 3; i++) blend.mix('layer', null, beam, shade, rect, mask(i), box, 0)
  expect(read.mock.calls).toEqual(limit
    ? [[rect.w, rect.h], ...Array.from({ length: 3 }, () => [box.w, box.h])]
    : Array.from({ length: 6 }, () => [box.w, box.h]))
  expect(draw).toHaveBeenCalledTimes(limit ? 4 : 6)
  if (limit) expect(create).toHaveBeenCalledTimes(2)
})

it('draws and reads only 20 endpoints across three ten-pose canopy cycles with seven mixes per pose', () => {
  const { factory, draw, read, put, create } = fakeCanvasFactory()
  const blend = new ReceiverBlend(factory)
  // Recorded Shadmot near-canopy crop and ten published poses (found/canopy-near.md).
  const bounds = { x: 0, y: 0, w: 1018, h: 141 }
  // At the same width, 142 rows reproduce the review's roughly 1.16 MB plane pair.
  const plane = { ...bounds, h: 142 }
  blend.mix('plane.near', null, source(), source(), plane, { ...mask(0), rect: plane }, plane, 0)
  draw.mockClear()
  read.mockClear()
  put.mockClear()
  create.mockClear()
  const poses = Array.from({ length: 10 }, () => ({ bitmap: source(), shade: source() }))
  const [base] = poses
  let revision = 0
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const { bitmap, shade } of poses) {
      for (let step = 0; step < 7; step++) {
        blend.mix('canopy.near', null, bitmap, shade, bounds, { ...mask(++revision), rect: bounds }, bounds, 0,
          poses, base.bitmap, base.shade)
      }
    }
    expect(read).toHaveBeenCalledTimes(20)
    expect(draw).toHaveBeenCalledTimes(20)
  }
  expect(put).toHaveBeenCalledTimes(210)
  expect(create).toHaveBeenCalledTimes(1)
})

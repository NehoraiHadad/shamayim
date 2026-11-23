import { describe, expect, it } from 'vitest'
import type { LayerOf } from '../../model/types'
import { paintCloudSheet } from './cloudSheet'
import type { Ctx2D, PaintEnv } from '../shared/base/hand'

const sheet = (alpha: number[]): LayerOf<'cloudSheet'> => ({
  kind: 'cloudSheet', id: 'cloudSheet.low', surface: 'sky', z: 8, lattice: 'low', genus: 'st',
  xs: [-10, 190, 390], ys: [0, 200, 300, 330], alpha, tone: alpha.map((_, i) => i / 11),
  body: [0.6, 0.6, 0.6], shade: [0.3, 0.3, 0.3], lit: [1, 1, 1],
} as unknown as LayerOf<'cloudSheet'>)

function harness() {
  const draws: number[][] = []
  let texels: { data: Uint8ClampedArray; width: number; height: number } | null = null
  const scratchCtx = {
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: (img: { data: Uint8ClampedArray; width: number; height: number }) => { texels = img },
  }
  const ctx = {
    save() {}, restore() {}, imageSmoothingEnabled: false, imageSmoothingQuality: 'low',
    drawImage: (_c: unknown, ...args: number[]) => draws.push(args),
  } as unknown as Ctx2D
  const env = { hand: { grain: 1 }, phase: 0, scale: 1, canvas: () => ({ canvas: {}, ctx: scratchCtx }) } as unknown as PaintEnv
  return { ctx, env, draws, texels: () => texels! }
}

describe('cloud sheet painter', () => {
  it('rasterises the sheet at half a sky px and stretches it in one draw, centre to centre, edge to edge', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet(Array(12).fill(0.5)), h.env)
    // 400 × 330 sky px at half a px: 201 × 166 pixels, the first and last on the grid's edges.
    expect([h.texels().width, h.texels().height]).toEqual([201, 166])
    expect(h.draws).toEqual([[0.5, 0.5, 200, 165, -10, 0, 400, 330]])
  })

  it('keeps a closed, uniform sheet as the model gives it: the softening never darkens or thins an even deck', () => {
    const h = harness()
    const desc = sheet(Array(12).fill(0.5))
    desc.tone = Array(12).fill(1)
    paintCloudSheet(h.ctx, desc, h.env)
    const { data } = h.texels()
    for (let n = 0; n < data.length; n += 4) expect(Array.from(data.slice(n, n + 4))).toEqual([77, 77, 77, 128])
  })

  it('draws an open deck translucent and lit at its thin parts, a near-opaque grey core, and nothing in open sky', () => {
    const h = harness()
    const desc = sheet([0, 0, 0, 0.4, 0.4, 0.4, 1, 1, 1, 1, 1, 1])
    desc.ys = [0, 100, 200, 300]
    desc.tone = Array(12).fill(1)
    paintCloudSheet(h.ctx, desc, h.env)
    const { data, width, height } = h.texels()
    const row = (k: number, i: number) => Array.from({ length: width }, (_, c) => data[(k * width + c) * 4 + i])
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
    expect(Math.max(...row(0, 3))).toBeLessThan(5)
    // The model's alpha 0.4 at y 100 (raster row 50): clearly translucent, and whiter than the core.
    expect(mean(row(50, 3))).toBeLessThan(0.4 * 255 * 0.6)
    expect(mean(row(50, 0))).toBeGreaterThan(mean(row(height - 1, 0)))
    expect(Math.min(...row(height - 1, 3))).toBeGreaterThan(200)
  })

  it('gives an open deck fine seeded detail where it is part-thick, the same on every paint', () => {
    const paint = () => {
      const h = harness()
      const desc = sheet([0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
      desc.ys = [0, 100, 200, 300]
      paintCloudSheet(h.ctx, desc, h.env)
      return h.texels()
    }
    const { data, width, height } = paint()
    const alpha = Array.from({ length: width }, (_, c) => data[((height - 20) * width + c) * 4 + 3])
    expect(Math.max(...alpha) - Math.min(...alpha)).toBeGreaterThan(30)
    expect(Array.from(paint().data)).toEqual(Array.from(data))
  })

  it('softens less toward the horizon, where the rows crowd: far rows stay small soft puffs', () => {
    const h = harness()
    const xs = Array.from({ length: 40 }, (_, i) => i * 2)
    const desc = sheet([])
    Object.assign(desc, { xs, ys: [0, 60, 63], alpha: [0, 1, 2].flatMap(() => xs.map((_, i) => (i < 20 ? 0 : 1))) })
    desc.tone = desc.alpha.map(() => 0)
    paintCloudSheet(h.ctx, desc, h.env)
    const { data, width, height } = h.texels()
    // The edge's rise, in px, from the first trace of cloud to the body.
    const rise = (k: number) => {
      const alpha = Array.from({ length: width }, (_, c) => data[(k * width + c) * 4 + 3])
      return alpha.findIndex((a) => a > 150) - alpha.findIndex((a) => a > 5)
    }
    expect(rise(2)).toBeGreaterThan(rise(height - 1) + 2)
  })

  it('paints nothing on a clear sheet', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet(Array(12).fill(0)), h.env)
    expect(h.draws).toEqual([])
  })
})

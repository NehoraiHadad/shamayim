import { describe, expect, it } from 'vitest'
import type { LayerOf } from '../model/types'
import { paintCloudSheet } from './cloudSheet'
import type { Ctx2D, PaintEnv } from './hand'

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
  it('resamples the uneven rows to even ones and stretches them in one draw, centre to centre, edge to edge', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet(Array(12).fill(0.5)), h.env)
    // 330 px at 2 px a row: 166 rows, the first on ys[0] and the last on ys[3].
    expect(h.texels().height).toBe(166)
    expect(h.draws).toEqual([[0.5, 0.5, 2, 165, -10, 0, 400, 330]])
  })

  it('writes alpha and the lit→body→shade tone per ray, and blends between rays down the column', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet([0, ...Array(10).fill(0.5), 1]), h.env)
    const { data, height } = h.texels()
    const px = (row: number, col: number) => Array.from(data.slice((row * 3 + col) * 4, (row * 3 + col) * 4 + 4))
    expect(px(0, 0)[3]).toBe(0) // clear ray
    expect(px(height - 1, 2)).toEqual([77, 77, 77, 255]) // tone 1, shade, opaque
    // Halfway between ys[0] and ys[1] (row 50 of 166 is y = 100), alpha is halfway between the two rays.
    expect(px(50, 0)[3]).toBe(64)
    // Premultiplied: a clear neighbour does not darken the colour.
    expect(px(50, 0).slice(0, 3)).toEqual(px(100, 0).slice(0, 3))
  })

  it('paints nothing on a clear sheet', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet(Array(12).fill(0)), h.env)
    expect(h.draws).toEqual([])
  })
})

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

  it('keeps a uniform sheet uniform: the softening never darkens or thins an even deck', () => {
    const h = harness()
    const desc = sheet(Array(12).fill(0.5))
    desc.tone = Array(12).fill(1)
    paintCloudSheet(h.ctx, desc, h.env)
    const { data } = h.texels()
    for (let n = 0; n < data.length; n += 4) expect(Array.from(data.slice(n, n + 4))).toEqual([77, 77, 77, 128])
  })

  it('melts a hard edge into the sky over a few px, monotonic and with no step, in the cloud colour', () => {
    const h = harness()
    const desc = sheet([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1])
    desc.ys = [0, 100, 101, 200]
    desc.tone = Array(12).fill(1)
    paintCloudSheet(h.ctx, desc, h.env)
    const { data, height } = h.texels()
    const alpha = Array.from({ length: height }, (_, k) => data[k * 12 + 3])
    for (let k = 1; k < height; k++) {
      expect(alpha[k]).toBeGreaterThanOrEqual(alpha[k - 1])
      expect(alpha[k] - alpha[k - 1]).toBeLessThan(40)
    }
    expect(alpha[0]).toBe(0)
    expect(alpha[height - 1]).toBe(255)
    const mid = alpha.findIndex((a) => a > 0 && a < 255)
    expect(Array.from(data.slice(mid * 12, mid * 12 + 3))).toEqual([77, 77, 77])
  })

  it('paints nothing on a clear sheet', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet(Array(12).fill(0)), h.env)
    expect(h.draws).toEqual([])
  })
})

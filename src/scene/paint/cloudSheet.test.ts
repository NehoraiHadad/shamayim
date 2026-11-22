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
  let texels: Uint8ClampedArray | null = null
  const scratchCtx = {
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: (img: { data: Uint8ClampedArray }) => { texels = img.data },
  }
  const ctx = {
    save() {}, restore() {}, imageSmoothingEnabled: false, imageSmoothingQuality: 'low',
    drawImage: (_c: unknown, ...args: number[]) => draws.push(args),
  } as unknown as Ctx2D
  const env = { hand: { grain: 1 }, phase: 0, scale: 1, canvas: () => ({ canvas: {}, ctx: scratchCtx }) } as unknown as PaintEnv
  return { ctx, env, draws, texels: () => texels }
}

describe('cloud sheet painter', () => {
  it('stretches one strip per row gap, centre to centre, edge to edge of the grid', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet(Array(12).fill(0.5)), h.env)
    expect(h.draws).toEqual([
      [0.5, 0.5, 2, 1, -10, 0, 400, 200], [0.5, 1.5, 2, 1, -10, 200, 400, 100], [0.5, 2.5, 2, 1, -10, 300, 400, 30],
    ])
  })

  it('writes alpha and the lit→body→shade tone per ray', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet([0, ...Array(10).fill(0.5), 1]), h.env)
    const t = h.texels()!
    expect([t[0], t[1], t[3]]).toEqual([255, 255, 0]) // tone 0, lit, clear
    expect([t[44], t[47]]).toEqual([77, 255]) // tone 1, shade, opaque
  })

  it('paints nothing on a clear sheet', () => {
    const h = harness()
    paintCloudSheet(h.ctx, sheet(Array(12).fill(0)), h.env)
    expect(h.draws).toEqual([])
  })
})

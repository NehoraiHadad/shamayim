import { describe, expect, it } from 'vitest'
import { EMPTY_VEGETATION } from '../model/vegDescriptor'
import type { LayerOf, RGB } from '../model/types'
import { HAND, type Ctx2D } from './hand'
import { paintPlane } from './planes'

describe('paintPlane fractional-pixel crest coverage', () => {
  it('applies outline coverage once at a fractional-pixel crest with zero median bleed', () => {
    // 12×20 raster with horizontal crest at y=10.5 -> row y=10 has exact 50% geometric coverage (cov = 0.5).
    const covAt = (y: number) => (y < 10 ? 0 : y === 10 ? 0.5 : 1)
    const parseCss = (s: string): [number, number, number, number] => {
      if (s === '#000') return [0, 0, 0, 1]
      const m = /rgb\((\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\)/.exec(s)!
      return [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] ? +m[4] : 1]
    }
    const runPaint = (palette: RGB[], cells: number[]) => {
      const rgba = Array.from({ length: 20 }, () => [0, 0, 0, 0])
      let clipped = false, fillStyle = 'rgb(0 0 0 / 1)', op = 'source-over', scratchImg: ImageData | null = null
      const over = (y: number, r: number, g: number, b: number, a: number) => {
        const d = rgba[y], inv = 1 - a
        d[0] = r * a + d[0] * inv; d[1] = g * a + d[1] * inv; d[2] = b * a + d[2] * inv; d[3] = a + d[3] * inv
      }
      const ctx = {
        save: () => {}, restore: () => { clipped = false; op = 'source-over' },
        beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
        clip: () => { clipped = true },
        set globalCompositeOperation(v: string) { op = v }, get globalCompositeOperation() { return op },
        set fillStyle(v: string) { fillStyle = v }, get fillStyle() { return fillStyle },
        fill: () => {
          const [r, g, b, a] = parseCss(fillStyle)
          for (let y = 0; y < 20; y++) {
            const sa = a * covAt(y)
            if (op === 'destination-in') { const d = rgba[y]; d[0] *= sa; d[1] *= sa; d[2] *= sa; d[3] *= sa }
            else over(y, r, g, b, sa)
          }
        },
        drawImage: () => {
          const d = scratchImg!.data, r = d[0] / 255, g = d[1] / 255, b = d[2] / 255
          for (let y = 0; y < 20; y++) over(y, r, g, b, clipped ? covAt(y) : 1)
        },
      } as unknown as Ctx2D
      const scratch = {
        createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (img: ImageData) => { scratchImg = img },
      } as unknown as Ctx2D
      const desc: LayerOf<'plane'> = {
        kind: 'plane', plane: 'near', id: 'plane.near', surface: 'land', z: 30, key: 'k',
        bounds: { x: 0, y: 0, w: 12, h: 20 }, outline: [[0, 10.5], [12, 10.5], [12, 20], [0, 20]],
        fill: [0.9, 0.1, 0.1], surfaceTone: { palette, cols: 1, rows: 1, cells, source: 'test' },
        gullies: [], terraces: [], vegetation: EMPTY_VEGETATION, grain: { amount: 0, seed: 1 },
        light: { key: 'l', blend: 'source-over', faces: [] },
      }
      paintPlane(ctx, desc, { hand: HAND, phase: 0, scale: 1, canvas: () => ({ canvas: {} as OffscreenCanvas, ctx: scratch }) })
      return rgba[10]
    }
    const textured = runPaint([[0.1, 0.7, 0.2]], [0])
    expect(textured[3]).toBeCloseTo(0.5, 5) // single 50% outline coverage, NOT 75%
    expect(textured[0] / textured[3]).toBeCloseTo(0.1, 2) // zero red median bleed
    expect(textured[1] / textured[3]).toBeCloseTo(0.7, 2)
    const fallback = runPaint([], [])
    expect(fallback[3]).toBeCloseTo(0.5, 5)
    expect(fallback[0] / fallback[3]).toBeCloseTo(0.9, 2)
  })
})

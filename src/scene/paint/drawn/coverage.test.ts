import { describe, expect, it } from 'vitest'
import type { LayerOf } from '../../model/types'
import type { Ctx2D, PaintEnv } from '../hand'
import { paintCloudSheet } from '../cloudSheet'
import { paintDrawnSheet } from './cloudSheet'

/* Where the cloud is belongs to the model: the drawn hand keeps every gap and every cloud the real one shows. */

type Sheet = LayerOf<'cloudSheet'>
interface Image { data: Uint8ClampedArray; width: number; height: number }

const COLS = 96, ROWS = 24, DX = 4, DY = 14
interface Cell { x: number; y: number; rx: number; ry: number }

/** A sheet of round cells on the model's kind of grid: fine across, coarse down, crisp edges. */
function sheetOf(cells: readonly Cell[]): Sheet {
  const alpha = Array.from({ length: COLS * ROWS }, (_, n) => {
    const x = (n % COLS) * DX, y = Math.floor(n / COLS) * DY
    const inside = Math.max(0, ...cells.map((c) => 1 - Math.hypot((x - c.x) / c.rx, (y - c.y) / c.ry)))
    return Math.min(1, inside * 8)
  })
  return { kind: 'cloudSheet', id: 'cloudSheet.mid', lattice: 'mid', genus: 'ac', xs: Array.from({ length: COLS }, (_, i) => i * DX),
    ys: Array.from({ length: ROWS }, (_, i) => i * DY), alpha, tone: alpha.map(() => 0.4), body: [0.74, 0.76, 0.8],
    shade: [0.5, 0.54, 0.6], lit: [0.9, 0.9, 0.92] } as unknown as Sheet
}

function raster(paint: typeof paintDrawnSheet, sheet: Sheet): Image {
  let image: Image = { data: new Uint8ClampedArray(), width: 0, height: 0 }
  const scratch = { createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    putImageData: (next: Image) => { image = next } }
  const ctx = { save() {}, restore() {}, drawImage() {} } as unknown as Ctx2D
  paint(ctx, sheet, { canvas: () => ({ canvas: {}, ctx: scratch }) } as unknown as PaintEnv)
  return image
}

/** Whether every px within `r` of (i, j) has an alpha the test takes. */
function around({ data, width, height }: Image, i: number, j: number, r: number, test: (a: number) => boolean): boolean {
  for (let y = Math.max(0, j - r); y <= Math.min(height - 1, j + r); y++) {
    for (let x = Math.max(0, i - r); x <= Math.min(width - 1, i + r); x++) if (!test(data[(y * width + x) * 4 + 3])) return false
  }
  return true
}

/** The model's own alpha under a raster px: the most of the four rays around it. */
function modelAt(sheet: Sheet, i: number, j: number, { width, height }: Image): number {
  const c = Math.min(COLS - 2, Math.floor((i / (width - 1)) * (COLS - 1))), r = Math.min(ROWS - 2, Math.floor((j / (height - 1)) * (ROWS - 1)))
  return Math.max(...[0, 1, COLS, COLS + 1].map((k) => sheet.alpha[r * COLS + c + k]))
}

const SCENES: Record<string, Cell[]> = {
  'two near neighbours': [{ x: 110, y: 130, rx: 56, ry: 80 }, { x: 236, y: 130, rx: 56, ry: 80 }],
  'one over another': [{ x: 190, y: 80, rx: 60, ry: 62 }, { x: 190, y: 235, rx: 60, ry: 62 }],
  'large and small': [{ x: 90, y: 110, rx: 70, ry: 90 }, { x: 190, y: 200, rx: 16, ry: 26 }, { x: 260, y: 90, rx: 40, ry: 46 }, { x: 310, y: 250, rx: 22, ry: 30 }],
}

describe('drawn coverage', () => {
  for (const [name, cells] of Object.entries(SCENES)) {
    it(`keeps every gap and every cloud: ${name}`, () => {
      const sheet = sheetOf(cells), real = raster(paintCloudSheet, sheet), drawn = raster(paintDrawnSheet, sheet)
      expect([drawn.width, drawn.height]).toEqual([real.width, real.height])
      let gap = 0, filled = 0, bridged = 0, solid = 0, covered = 0
      for (let j = 0; j < real.height; j++) {
        for (let i = 0; i < real.width; i++) {
          const a = drawn.data[(j * real.width + i) * 4 + 3]
          if (around(real, i, j, 2, (v) => v < 8)) { gap++; if (a > 20) filled++ }
          if (modelAt(sheet, i, j, real) < 0.01 && a > 64) bridged++
          if (around(real, i, j, 3, (v) => v > 120)) { solid++; if (a > 110) covered++ }
        }
      }
      expect(gap).toBeGreaterThan(2000)
      // The real hand's grain eats a little of its own rim: where the model has no cloud, nothing is filled at all.
      expect(filled / gap).toBeLessThan(0.0005)
      expect(bridged).toBe(0)
      expect(solid).toBeGreaterThan(300)
      // A flat base takes a little of a round foot.
      expect(covered / solid).toBeGreaterThan(0.9)
    })
  }

  it('draws a clear column between two cells a few px apart, all the way down', () => {
    const { data, width, height } = raster(paintDrawnSheet, sheetOf(SCENES['two near neighbours']))
    const middle = Math.round((173 / (DX * (COLS - 1))) * (width - 1))
    for (let j = 0; j < height; j++) expect(data[(j * width + middle) * 4 + 3]).toBeLessThan(20)
  })

  it('stands a lone heap on a flat base, under a crown that is not one smooth curve', () => {
    const cell = { x: 190, y: 190, rx: 80, ry: 90 }
    const { data, width, height } = raster(paintDrawnSheet, sheetOf([cell]))
    const column = (i: number) => {
      const on = Array.from({ length: height }, (_, j) => j).filter((j) => data[(j * width + i) * 4 + 3] > 110)
      return { top: on[0], foot: on[on.length - 1] }
    }
    const mid = Math.round((cell.x / (DX * (COLS - 1))) * (width - 1))
    const span = Array.from({ length: 31 }, (_, k) => column(mid - 15 + k))
    const feet = span.map((c) => c.foot)
    expect(Math.max(...feet) - Math.min(...feet)).toBeLessThan(4)
    const tops = Array.from({ length: 61 }, (_, k) => column(mid - 30 + k).top)
    const bends = tops.slice(2).filter((t, k) => Math.sign(tops[k + 1] - tops[k]) !== Math.sign(t - tops[k + 1]))
    expect(bends.length).toBeGreaterThan(6)
  })
})

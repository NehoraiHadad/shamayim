import { expect, it } from 'vitest'
import type { LayerOf, MistBandDesc } from '../../../model/types'
import { HAND, type Ctx2D, type PaintEnv } from '../../shared/base/hand'
import { fogRows, paintFog } from './fog'

const bounds = { x: 0, y: 30, w: 240, h: 90 }
const band: MistBandDesc = { top: 40, fade: 20, bottom: 120, rgb: [0.6, 0.65, 0.7], alpha: 0.7,
  puffs: [{ x: 60, y: 44, rx: 30.3, ry: 5, alpha: 0.6 }, { x: 180, y: 48, rx: 22.9, ry: 4, alpha: 0.8 }] }

/** The raster a band lays, as alpha by row and column. */
function raster(): number[][] {
  let image!: { data: Uint8ClampedArray; width: number; height: number }
  const scratch = { createImageData: (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: (laid: typeof image) => { image = laid } } as unknown as Ctx2D
  const env: PaintEnv = { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: {} as OffscreenCanvas, ctx: scratch }) }
  paintFog({ drawImage: () => {} } as unknown as Ctx2D, { kind: 'mist', bounds, bands: [band] } as unknown as LayerOf<'mist'>, env)
  return Array.from({ length: image.height }, (_, j) =>
    Array.from({ length: image.width }, (_, i) => image.data[(j * image.width + i) * 4 + 3] / 255))
}

it('hides on every row as much as the model says, unevenly along it', () => {
  const rows = raster(), mean = fogRows(band, bounds, rows.length)
  rows.forEach((row, j) => {
    const own = row.slice(1, -1)
    expect(Math.abs(own.reduce((sum, a) => sum + a, 0) / own.length - mean[j])).toBeLessThan(0.01)
  })
  const middle = rows[Math.round(rows.length / 2)]
  expect(Math.max(...middle) - Math.min(...middle)).toBeGreaterThan(0.1)
})

it('starts from nothing and meets itself round the tile', () => {
  const rows = raster()
  expect(Math.max(...rows[0])).toBeLessThan(0.03)
  for (const row of rows) {
    expect(row[0]).toBe(row.at(-2))
    expect(row.at(-1)).toBe(row[1])
  }
})

it('keeps the body of the model below its top', () => {
  const mean = fogRows({ ...band, puffs: [] }, bounds, 90)
  // `fade` under the top three quarters of the band's own alpha; all of it at the foot.
  expect(mean[30]).toBeCloseTo(0.75 * band.alpha, 1)
  expect(mean[89]).toBeCloseTo(band.alpha, 2)
})

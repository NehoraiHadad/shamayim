import { expect, it } from 'vitest'
import { STYLES } from '../scene/paint/styles'
import { SHARED } from '../scene/paint/shared/painters'
import { ROW_DE, worstRow, type Raster } from './skyBaseRows'

const W = 64, H = 40
function raster(at: (x: number, y: number) => number): Raster {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data.set([at(x, y) - 30, at(x, y), at(x, y) + 20, 255], (y * W + x) * 4)
  return { data, width: W, height: H }
}
const sky = (_: number, y: number) => 120 + y
const plain = raster(sky)

it('takes a grain that keeps each row\'s mean, and the same base as no distance at all', () => {
  expect(worstRow(plain, plain)).toEqual({ y: 0, dE: 0 })
  const grain = raster((x, y) => sky(x, y) + (x % 2 ? 4 : -4))
  expect(worstRow(grain, plain).dE).toBeLessThan(ROW_DE / 4)
})

it('finds the one row that is not the default\'s', () => {
  const off = raster((x, y) => sky(x, y) + (y === 17 ? 4 : 0))
  expect(worstRow(off, plain)).toMatchObject({ y: 17 })
  expect(worstRow(off, plain).dE).toBeGreaterThan(ROW_DE)
  expect(() => worstRow({ ...plain, height: H - 1 }, plain)).toThrow()
})

it('a style has a base of its own in both forms, or in neither', () => {
  for (const { painters, skyBase } of Object.values(STYLES)) expect(Boolean(skyBase)).toBe(painters.sky !== SHARED.sky)
})

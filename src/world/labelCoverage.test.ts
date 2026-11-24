import { expect, it } from 'vitest'
import { coverageRaster } from './labelCoverage'

it('unions repeated cells and masks fabric where marks already cover it', () => {
  const region = { left: 0, right: 10, top: 0, bottom: 10 }
  const marks = coverageRaster(region), fabric = coverageRaster(region)
  const tower = { ...region, left: 5, right: 15 }
  marks.fill(tower, 3)
  marks.fill(tower, 3)
  marks.fill({ ...region, left: 1, right: 7 })
  fabric.fill(region)
  fabric.integrate(marks.cells)
  marks.integrate()
  expect(marks.area(0, 10, 0, marks.bottom(10))).toBe(190)
  expect(fabric.area(0, 10, 0, fabric.bottom(10))).toBe(10)
})

it('counts a subpixel obstacle and leaves the next untouched cell free', () => {
  const raster = coverageRaster({ left: -2.5, right: 3.5, top: 0, bottom: 2 })
  raster.fill({ left: -.1, right: .1, top: .1, bottom: .2 })
  raster.integrate()
  const bottom = raster.bottom(1)
  expect(raster.area(raster.left(-1), raster.right(1), 0, bottom)).toBe(2)
  expect(raster.area(raster.left(1), raster.right(2), 0, bottom)).toBe(0)
})

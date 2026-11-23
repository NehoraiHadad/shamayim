import { expect, it } from 'vitest'
import { throughAir } from './throughAir'

it('attenuates only the finished alpha using the raster row’s elevation', () => {
  const data = new Uint8ClampedArray([
    90, 120, 150, 200, 90, 120, 150, 100,
    90, 120, 150, 200, 90, 120, 150, 100,
    90, 120, 150, 200, 90, 120, 150, 100,
  ])
  const ys = [0, 25, 100]
  const clear = data.slice()
  throughAir(data, 2, 3, { ys })
  expect(data).toEqual(clear)

  throughAir(data, 2, 3, { ys, through: [1, 0.75, 0] })
  expect([...data]).toEqual([
    90, 120, 150, 200, 90, 120, 150, 100,
    90, 120, 150, 100, 90, 120, 150, 50,
    90, 120, 150, 0, 90, 120, 150, 0,
  ])
})

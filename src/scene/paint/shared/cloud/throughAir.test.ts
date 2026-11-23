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

it('reports incremental dust multiply cost for a 375 × 428 raster in CI', () => {
  const w = 375, h = 428
  const clean = { ys: [0, h / 2, h - 1] }
  const dust = { ...clean, through: [0.16, 0.03, 0] }
  const data = new Uint8ClampedArray(w * h * 4)
  const cost = { clean: [] as number[], dusty: [] as number[] }
  const n = 40
  for (let run = 0; run < 7; run++) {
    for (const mode of (run % 2 === 0 ? ['clean', 'dusty'] : ['dusty', 'clean']) as (keyof typeof cost)[]) {
      const desc = mode === 'dusty' ? dust : { ...clean, through: undefined }
      let elapsed = 0
      for (let i = 0; i < n; i++) {
        data.fill(200)
        const start = performance.now()
        if (desc.through) throughAir(data, w, h, desc)
        elapsed += performance.now() - start
      }
      if (run > 0) cost[mode].push(elapsed / n)
    }
  }
  console.log(JSON.stringify({ dustMsPerRaster: cost, raster: [w, h] }))
})

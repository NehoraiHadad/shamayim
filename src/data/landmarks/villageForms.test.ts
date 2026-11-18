import { expect, it } from 'vitest'
import type { Cluster } from '../city/clusterTypes'
import { seeded } from './hash'
import { shedCount, villageDims } from './villageForms'

const cluster = (size: number, levels: number, big = 0) => ({ form: { size, big, pitched: 0, flat: 0, evidence: 0 }, levels }) as Cluster
const sample = (home: Cluster, style: 'tile' | 'flat-hill' = 'tile') => {
  const dims = villageDims(home, style), random = seeded(1)
  return Array.from({ length: 200 }, (_, i) => dims(0, i, random))
}

it('kibbutz dwellings draw the small house only, one storey when levels < 1.5', () => {
  const houses = sample(cluster(2, 1.1))
  expect(houses.every(house => house.w === 7 && house.h === 5 && !house.storeys)).toBe(true)
})

it('large footprints draw the 9 × 7 house on about every second plot; levels set the two-storey share', () => {
  const houses = sample(cluster(4, 1.8))
  const wide = houses.filter(house => house.w === 9).length / houses.length
  const two = houses.filter(house => house.storeys === 2).length / houses.length
  expect(wide).toBeGreaterThan(.4); expect(wide).toBeLessThan(.6)
  expect(two).toBeGreaterThan(.7); expect(two).toBeLessThan(.9)
})

it('flat-roof villages stack 2-4 storeys from the measured levels', () => {
  const heights = new Set(sample(cluster(3, 3), 'flat-hill').map(house => house.h))
  expect([...heights].every(h => [5.5, 7, 8.5].includes(h))).toBe(true)
})

it('sheds follow the big-roof share, four at most', () => {
  expect([0, .1, .3, .6, 1].map(big => shedCount(cluster(3, 1, big)))).toEqual([0, 0, 1, 2, 4])
})

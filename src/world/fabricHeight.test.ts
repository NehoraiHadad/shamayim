import { expect, it } from 'vitest'
import type { RasterSquare } from '../data/city/cityRaster'
import { HOUSE_TOP_M } from '../data/city/outsideView'
import { STOREY_M } from '../data/city/skylineHeight'
import type { CityResult, CityTower } from '../data/city/types'
import { fabricHeights } from './fabricHeight'

const LAT = 32.1, LON = 34.8
const tower = (heightM: number, wClass: 0 | 1 | 2 = 1): CityTower => ({ dx: 0, dy: 0, lat: LAT, lon: LON, heightM, wClass })
const roof = (square: Omit<RasterSquare, 'p90'>, towers: CityTower[], lon = LON) =>
  fabricHeights({ towers } as unknown as CityResult)({ ...square, p90: 60 }, LAT, lon, .5).heightM
const BLOCK_15 = 15 * STOREY_M + 1

it('keeps the blocks of a sparse square beside one mapped tower of a hundred metres', () => {
  expect(roof({ built: 2 / 15, levels: 15 }, [tower(100)])).toBe(BLOCK_15)
  expect(roof({ built: 2 / 15, levels: 15 }, [tower(100, 0), tower(48, 0)])).toBe(BLOCK_15)
})

it('takes the towers for the typical building where they cover half of what is built, above the raster\'s storeys too', () => {
  for (const towers of [[tower(100, 2)], [tower(48), tower(100)]]) {
    expect(roof({ built: 2 / 15, levels: 15 }, towers)).toBeLessThan(HOUSE_TOP_M)
    // In the next square they are no evidence.
    expect(roof({ built: 2 / 15, levels: 15 }, towers, LON + .01)).toBe(BLOCK_15)
  }
  expect(roof({ built: 1 / 15, levels: 15 }, [tower(48)])).toBeLessThan(HOUSE_TOP_M)
})

it('tells a typical block from the tower over it, and from a lower one', () => {
  expect(roof({ built: 1 / 15, levels: 12 }, [tower(100, 2)])).toBe(12 * STOREY_M + 1)
  expect(roof({ built: 1 / 15, levels: 13 }, [tower(38.4, 2)])).toBe(13 * STOREY_M + 1)
  expect(roof({ built: 1 / 15, levels: 13 }, [tower(41.6)])).toBeLessThan(HOUSE_TOP_M)
})

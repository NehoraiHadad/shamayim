import { expect, it } from 'vitest'
import { composeCity, hasCityFabric } from './fabric'
import type { CityColumns } from './types'

const columns = (west = 34.6, built = .8): CityColumns => ({
  west, span: .25, rows: [0, 1, 2].map(() => Array.from({ length: 188 }, () => ({ built, measured: built, upper: 19, levels: 4 }))) as CityColumns['rows'],
})
const base = { width: 375, ground: () => 75, centerX: 187.5, centerY: 75, litShare: .5, floor: 106 }

it('builds only within qualifying bins and protects the dot, label, and keep-out boxes', () => {
  const data = columns()
  for (const row of data.rows) for (let i = 125; i < 140; i++) row[i].built = .119
  const keepOut = [{ left: 98, right: 112, top: 50, bottom: 80 }]
  const result = composeCity({ ...base, columns: data, keepOut })
  expect(result.houses.length).toBeGreaterThan(10)
  expect(hasCityFabric(data, 375, base.centerX)).toBe(true)
  expect(hasCityFabric(columns(34.6, .119), 375, base.centerX)).toBe(false)
  for (const { x, w, row, baseY } of result.houses) {
    expect(x + w / 2 <= 250 || x - w / 2 >= 280).toBe(true)
    expect(x + w / 2 <= 96 || x - w / 2 >= 114).toBe(true)
    if (row >= 1) expect(Math.abs(x - base.centerX) - w / 2).toBeGreaterThanOrEqual(5.99)
    if (row === 2) expect(Math.abs(x - base.centerX) - w / 2).toBeGreaterThanOrEqual(25)
    if (Math.abs(x - base.centerX) - w / 2 < 23) expect(baseY + 2).toBeLessThanOrEqual(result.labelTop)
  }
})

it('prioritizes line blocks nearest the dot when the scene is over budget', () => {
  const result = composeCity({ ...base, columns: columns() })
  expect(result.houses).toHaveLength(96)
  expect(result.houses.some(house => house.row === 1 && Math.abs(house.x - base.centerX) < 18)).toBe(true)
  expect(result.houses.filter(house => house.row === 1).length).toBeGreaterThan(35)
  const wide = composeCity({ ...base, width: 525, centerX: 262.5, columns: columns() })
  expect(wide.houses).toHaveLength(120)
})

it('keeps the same block geometry in a shared geographic stretch after recentering', () => {
  const shift = .02
  const sample = (west: number, span: number) => {
    const city = columns(west)
    city.span = span
    return composeCity({ ...base, columns: city }).houses.filter(house => house.row === 1).flatMap(house => {
      const lon = west + house.x * city.span / base.width
      return lon > 34.67 && lon < 34.705 ? [{ ...house, x: Number(lon.toFixed(7)) }] : []
    })
  }
  const shared = sample(34.6, .25)
  expect(shared.length).toBeGreaterThan(4)
  expect(sample(34.6 + shift, .253)).toEqual(shared)
})

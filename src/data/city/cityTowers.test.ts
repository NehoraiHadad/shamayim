import { expect, it } from 'vitest'
import { skyHeight } from './cityHeight'
import { placeCityTowers } from './cityTowers'
import type { CityTower } from './types'

const tower = (dx: number, dy: number, extra?: Partial<CityTower>): CityTower =>
  ({ dx, dy, lat: 32 + dy / 111.32, lon: 34.88 + dx / 94.4, heightM: 100, wClass: 1, ...extra })
const base = { width: 750, ground: () => 75, floor: 100, centerX: 375, centerY: 75, curated: [] }

it('projects onto the actual scene width and seats each exact depth row', () => {
  const towers = [tower(-4, .751, { wClass: 0 }), tower(-2, .75), tower(2, -.75), tower(4, -.751, { wClass: 2 })]
  expect(placeCityTowers({ ...base, towers }).sort((a, b) => a.x - b.x)).toMatchObject([
    { x: 250, w: 3.5, baseY: 74, row: 0, h: 22 },
    { x: 312.5, w: 5, baseY: 76, row: 1, h: 22 },
    { x: 437.5, w: 5, baseY: 76, row: 1, h: 22 },
    { x: 500, w: 7, baseY: 80, row: 2, h: 22 },
  ])
})

it('seats on the downhill edge of the rendered podium', () => {
  const ground = (x: number) => 50 + x / 10
  const towers = [tower(-4, 1, { wClass: 2 })]
  expect(placeCityTowers({ ...base, ground, towers })[0].baseY).toBe(ground(255) - 1)
})

it('drops colliding towers and preserves the height of a tower behind the dot', () => {
  const behind = tower(0, 1, { heightM: 152, name: 'Back' })
  const curated = tower(2, 0)
  const towers = [behind, tower(.2, 0), curated, tower(4, 0)]
  const placed = placeCityTowers({ ...base, towers, curated: [{ ...curated, lat: curated.lat + .002 }],
    keepOut: [{ left: 495, right: 505, top: 50, bottom: 80 }] })
  expect(placed).toMatchObject([{ name: 'Back', h: skyHeight(152), row: 0 }])
})

it('drops towers at the caption, top, or floor instead of clipping their height', () => {
  const towers = [tower(-10, 1), tower(-2, 0), tower(2, -1), tower(4, 0)]
  const ground = (x: number) => x < 220 ? 43 : x < 375 ? 23 : x < 475 ? 99 : 101
  expect(placeCityTowers({ ...base, towers, ground })).toEqual([])
})

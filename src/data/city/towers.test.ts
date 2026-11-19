import { expect, it } from 'vitest'
import { selectTowers, towerX } from './towers'
import type { CityTower } from './types'

const tower = (dx: number, dy: number, heightM: number): CityTower =>
  ({ dx, dy, heightM, lat: 32 + dy / 111.32, lon: 34.88 + dx / 94.4, wClass: 1 })

it.each([[375, 10], [900, 16]])('reserves local towers and applies spacing and the cap at %s px', (width, cap) => {
  const local = [tower(-2.2, .6, 152), tower(-1.55, .9, 100)]
  const distant = Array.from({ length: 30 }, (_, i) => tower((i < 15 ? -1 : 1) * (6 + i % 15 * .28), 0, 240 - i))
  const candidates = [...local, ...distant, tower(12.01, 0, 350)]
  const selected = selectTowers(candidates, width)
  expect(selected).toEqual(expect.arrayContaining(local))
  expect(selected).toEqual(selectTowers([...candidates].reverse(), width))
  expect(selected.length).toBeLessThanOrEqual(cap)
  expect(selected).not.toContain(candidates.at(-1))
  const xs = selected.map(({ dx }) => towerX(dx, width)).sort((a, b) => a - b)
  expect(xs.slice(1).every((x, i) => x - xs[i] >= 5)).toBe(true)
})

it('caps dense scenes and orders equal scores geographically', () => {
  const candidates = Array.from({ length: 25 }, (_, i) => tower(i - 12, 0, 100))
  expect(selectTowers(candidates, 375)).toHaveLength(10)
  expect(selectTowers(candidates, 900)).toHaveLength(16)
  // Left to right on screen: the easternmost (dx 12) first, east being on the left.
  expect(selectTowers(candidates, 900)[0].dx).toBe(12)
})

it('ranks a named tower above a deeper tower of the same height in its slot', () => {
  const named = { ...tower(6, .75, 100), name: 'Exchange tower' }
  expect(selectTowers([tower(6.1, 4, 100), named], 375)).toEqual([named])
})

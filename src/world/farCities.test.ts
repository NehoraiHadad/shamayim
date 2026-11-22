import { expect, it } from 'vitest'
import { apparentHeight, baseAngle, MARK_MIN_PX } from '../data/terrain/apparentHeight'
import { townShapes } from './farCities'
import type { FarPatch } from './types'

const patch = (km: number): FarPatch => ({ left: 120, right: 150, top: 85, bottom: 95, km, built: 1, level: 15, area:
  1 })

it('draws true far-block heights above the shared floor, including heights above the former 7 px cap', () => {
  const blocks = townShapes([patch(.5)], [], 'angular-test', 100).blocks
  expect(blocks.length).toBeGreaterThan(0)
  expect(Math.max(...blocks.map(b => b.h))).toBeGreaterThan(7)
  for (const block of blocks) {
    expect(block.heightM).toBeDefined()
    expect(block.h).toBeGreaterThanOrEqual(MARK_MIN_PX)
    expect(block.h).toBeCloseTo(apparentHeight(block.heightM!, block.km, baseAngle(block.base, 100)), 8)
  }
})

it('culls subpixel far blocks instead of raising them to a decorative minimum', () => {
  expect(townShapes([patch(1000)], [], 'angular-test', 100).blocks).toEqual([])
})

it('does not inflate a subpixel tower or invent a low hall beneath it', () => {
  const towers = [{ x: 100, top: 89.7, base: 90, km: 80, heightM: 9, onRidge: true }]
  expect(townShapes([], towers, 'angular-test', 100).blocks).toEqual([])
  const tall = { ...towers[0], top: 60, heightM: 800 }
  const blocks = townShapes([], [tall], 'angular-test', 100).blocks
  expect(blocks).toHaveLength(1)
  expect(blocks[0].h).toBeCloseTo(apparentHeight(800, 80, baseAngle(90, 100)), 8)
})

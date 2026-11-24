import { describe, expect, it } from 'vitest'
import type { CoverCell, FootprintHouse } from '../../data/village/settlement'
import { housesOfCells } from './fromCells'
import { housesOfFootprints, thinned } from './fromFootprints'
import type { VillageFrame } from './frame'
import { heldToHouses, isOwnLandmark } from './landmarks'
import { standsDry } from './water'

const STEP = .05
const cells = (wide: number, deep: number, holds: (x: number) => number = () => 3): CoverCell[] =>
  Array.from({ length: wide * deep }, (_, i) => {
    const x = i % wide, y = Math.floor(i / wide)
    return { dx: x * STEP, dy: y * STEP, holds: holds(x), known: true, seed: 1000 + i * 17, outline: !x || !y || x === wide - 1 || y === deep - 1 }
  })

describe('houses of cells', () => {
  const block = cells(10, 8)
  it('are as many as asked for, at most four in a cell', () => {
    for (const n of [1, 20, 57, 200]) expect(housesOfCells(block, n, 31.6)).toHaveLength(n)
    expect(housesOfCells(block, 9999, 31.6)).toHaveLength(320)
  })
  it('are the same on every load, in any order of the cells', () => {
    const by = (houses: ReturnType<typeof housesOfCells>) => [...houses].sort((a, b) => a.seed - b.seed)
    expect(by(housesOfCells([...block].reverse(), 50, 31.6))).toEqual(by(housesOfCells(block, 50, 31.6)))
  })
  it('stand in their cells', () => {
    for (const { dx, dy } of housesOfCells(block, 200, 31.6)) {
      const cell = block.find(c => Math.abs(c.dx - dx) <= STEP / 2 + .004 && Math.abs(c.dy - dy) <= STEP / 2 + .004)
      expect(cell).toBeDefined()
    }
  })
  it('draw the edge first, and never all of them at it', () => {
    const edge = (n: number) => housesOfCells(block, n, 31.6).filter(({ dx, dy }) =>
      block.some(c => c.outline && Math.abs(c.dx - dx) < STEP / 2 && Math.abs(c.dy - dy) < STEP / 2)).length
    expect(edge(30)).toBeGreaterThanOrEqual(20)
    expect(edge(30)).toBeLessThan(30)
  })
  it('are denser where the cells hold more', () => {
    const houses = housesOfCells(cells(10, 10, x => x < 5 ? 1 : 6), 60, 31.6)
    expect(houses.filter(h => h.dx > 4.5 * STEP).length).toBeGreaterThan(1.5 * houses.filter(h => h.dx < 4.5 * STEP).length)
  })
  it('are dropped where they may not stand', () =>
    expect(housesOfCells(block, 100, 31.6, ({ dx }) => dx > .2).every(h => h.dx > .2)).toBe(true))
  it('are none of no cells', () => expect(housesOfCells([], 10, 31.6)).toEqual([]))
})

describe('houses of footprints', () => {
  const house = (i: number, more: Partial<FootprintHouse> = {}): FootprintHouse =>
    ({ dx: i * .03, dy: 0, holds: 1, outline: false, across: true, size: 1, row: 0, seed: i, ...more })
  const street = Array.from({ length: 30 }, (_, i) => house(i))
  const draw = (count: number, spots = street, rows = [{ start: 0, count: 30, ring: false }]) => housesOfFootprints(spots, rows, count)
  it('are real ones, about as many as asked for, a street\'s with its ends', () => {
    const drawn = draw(12)
    expect(drawn).toHaveLength(12)
    expect(drawn.map(h => h.seed)).toEqual(expect.arrayContaining([0, 29]))
    expect(draw(999)).toHaveLength(30)
  })
  it('add up over many short rows', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ start: i * 3, count: 3, ring: false }))
    expect(Math.abs(draw(13, street, rows).length - 13)).toBeLessThanOrEqual(1)
    expect(Math.abs(draw(13, street, []).length - 13)).toBeLessThanOrEqual(1)
  })
  it('go evenly round a ring', () => {
    expect(thinned([0, 1, 2, 3, 4, 5, 6, 7], 4, true)).toEqual([0, 2, 4, 6])
    expect(thinned([0, 1, 2, 3, 4], 3, false)).toEqual([0, 2, 4])
    expect(thinned([0, 1, 2], 1, false)).toEqual([1])
    expect(thinned([0, 1], 0, false)).toEqual([])
  })
  it('keep the edge more often', () => {
    const spots = street.map((h, i) => ({ ...h, outline: i >= 20 }))
    const rows = [{ start: 0, count: 20, ring: false }, { start: 20, count: 10, ring: false }]
    const drawn = draw(15, spots, rows)
    expect(drawn.filter(h => h.seed >= 20)).toHaveLength(9)
  })
  it('have the front the eye meets', () => {
    const front = (more: Partial<FootprintHouse>) => housesOfFootprints([house(0, more)], [], 1)[0].frontM
    expect(front({ across: true }) / front({ across: false })).toBeCloseTo(1.35, 6)
    expect([0, 1, 2, 3].map(size => front({ size: size as 0 }))).toEqual([...[0, 1, 2, 3].map(size => front({ size: size as 0 }))].sort((a, b) => a - b))
  })
  it('stand on no water, and their number is made up on land', () => {
    const drawn = housesOfFootprints(street, [{ start: 0, count: 30, ring: false }], 12, h => standsDry({ ...h, frontM: 13 }, 2.2, dx => dx < .2))
    expect(drawn).toHaveLength(12)
    expect(drawn.every(h => h.dx - .0143 >= .2)).toBe(true)
  })
})

describe('a landmark', () => {
  const frame = { frame: { w: -.3, e: .3, s: -.2, n: .2 }, housePx: 6.2, share: 1 } as VillageFrame
  it('is the settlement\'s own in its box and a little past it', () => {
    expect(isOwnLandmark(frame, .44, 0)).toBe(true)
    expect(isOwnLandmark(frame, .46, 0)).toBe(false)
    expect(isOwnLandmark(frame, 0, -.36)).toBe(false)
  })
  it('is at most twice its true ratio to a house, and is left alone below it', () => {
    const synagogue = 9 * 6.2 / 13.5
    expect(40 * heldToHouses(40, 9, frame)).toBeCloseTo(2 * synagogue, 6)
    expect(heldToHouses(1.9 * synagogue, 9, frame)).toBe(1)
    expect(heldToHouses(40, 9, { ...frame, share: 0 })).toBe(1)
  })
})
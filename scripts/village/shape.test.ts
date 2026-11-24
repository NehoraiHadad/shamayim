import { describe, expect, it } from 'vitest'
import { outlineOf } from './outline'
import { rowsOf, type Spot } from './rows'

const line = (count: number, step: number, y = 0): Spot[] => Array.from({ length: count }, (_, i) => ({ x: i * step, y }))
const circle = (count: number, radius: number): Spot[] => Array.from({ length: count }, (_, i) =>
  ({ x: radius * Math.cos(i / count * 2 * Math.PI), y: radius * Math.sin(i / count * 2 * Math.PI) }))
const lengths = (spots: Spot[]) => rowsOf(spots).map(({ at, ring }) => ring ? -at.length : at.length)

describe('rows of houses', () => {
  it('follow a street, in walking order', () => expect(rowsOf(line(5, 30)).map(r => r.at)).toEqual([[0, 1, 2, 3, 4]]))
  it('break where houses stand too far apart, and leave one alone', () =>
    expect(lengths([...line(3, 30), { x: 120, y: 0 }, ...line(2, 30).map(s => ({ ...s, x: s.x + 300 }))])).toEqual([3, 2]))
  it('turn with a bend and not round a corner', () => {
    expect(lengths([{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 55, y: 15 }])).toEqual([3])
    expect(lengths([{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 31 }])).toEqual([2])
  })
  it('close into a ring from eight houses', () => {
    expect(lengths(circle(12, 60))).toEqual([-12])
    expect(lengths(circle(7, 30)).every(count => count > 0)).toBe(true)
  })
  it('are the same in another order of the houses', () => {
    const spots = [...line(6, 31), ...line(4, 33, 80)]
    const places = (all: Spot[]) => rowsOf(all).map(r => r.at.map(i => `${all[i].x},${all[i].y}`).sort().join(' '))
    expect(places([...spots].reverse())).toEqual(places(spots))
  })
})

describe('the outline', () => {
  const block = line(5, 40).flatMap(({ x }) => line(5, 40).map(s => ({ x, y: s.x })))
  it('is the block\'s sides, and none of its middle', () => {
    const edge = outlineOf(block)
    block.forEach(({ x, y }, i) => expect(edge[i], `${x},${y}`).toBe(x === 0 || y === 0 || x === 160 || y === 160))
  })
  it('is any house that stands alone or at a street\'s end', () => {
    expect(outlineOf([{ x: 0, y: 0 }])).toEqual([true])
    expect(outlineOf([{ x: 0, y: 0 }, { x: 500, y: 0 }])).toEqual([true, true])
  })
  it('does not depend on where the grid lies', () => {
    const moved = block.map(({ x, y }) => ({ x: x - 1037, y: y + 513 }))
    expect(outlineOf(moved)).toEqual(outlineOf(block))
  })
})

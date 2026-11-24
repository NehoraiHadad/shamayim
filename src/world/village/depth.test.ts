import { describe, expect, it } from 'vitest'
import { frameOfBox, NEAR_DROP } from '../../data/city/outsideView'
import type { SettlementSource } from '../../data/village/settlement'
import { FRAME_SCALE } from '../outside'
import { drawnCount } from './count'
import { depthOf, dotYOf, feetOf, footsOf, type DepthRoom } from './depth'
import { villageFrame } from './frame'

const W = 375
const at = (wide: number, deep = wide) => villageFrame({ kind: 'cells', spots: [], group: { w: -wide / 2, e: wide / 2, s: -deep / 2, n: deep / 2,
  extentKm: Math.max(wide, deep), houses: 100 } } as unknown as SettlementSource, frameOfBox(null, wide, W / 2, W, true, FRAME_SCALE), W)
const grid = (wide: number, deep = wide) => [-.5, -.25, 0, .25, .5].flatMap(x => [-.5, -.25, 0, .25, .5].map(y => ({ dx: x * wide, dy: y * deep })))
const room = (top: number, floor = 108, hill = 0): DepthRoom => ({ top: () => top, floor, lift: (_, dy) => dy * hill })
const depth = (km: number, where: DepthRoom) => {
  const own = at(km)
  return depthOf(feetOf(own.frame, grid(km), where), own.widthPx, where.floor, own.share)
}

describe('the depth', () => {
  it('is a third of the width where the land has the room', () =>
    expect(depth(.64, room(50)).depthPx).toBeCloseTo(at(.64).widthPx / 3, 6))
  it('is a town\'s from five kilometres on, whatever the room', () => {
    expect(depth(5, room(107))).toEqual({ depthPx: NEAR_DROP, fits: true })
    expect(depth(9, room(20))).toEqual({ depthPx: NEAR_DROP, fits: true })
  })
  it('is the most the room takes, and every foot then stands in it', () => {
    for (const hill of [0, 12, -12]) {
      const where = room(85, 108, hill), own = at(1.5), spots = grid(1.5), at0 = feetOf(own.frame, spots, where)
      const { depthPx, fits } = depthOf(at0, own.widthPx, 108, own.share)
      expect(fits).toBe(true)
      expect(depthPx).toBeLessThan(own.widthPx / 3)
      const footY = footsOf(own.frame, depthPx, dotYOf(at0, depthPx, 89, 108), where), feet = spots.map(({ dx, dy }) => footY(dx, dy))
      expect(Math.min(...feet)).toBeGreaterThanOrEqual(85 - 1e-6)
      expect(Math.max(...feet)).toBeLessThanOrEqual(108 + 1e-6)
      // The whole room is used: the feet reach both of its ends.
      expect(Math.max(...feet) - Math.min(...feet)).toBeCloseTo(23, 2)
    }
  })
  it('says when nothing fits, and holds the feet to the land', () => {
    const where: DepthRoom = { top: () => 100, floor: 104, lift: dx => dx * 80 }, own = at(1)
    const { depthPx, fits } = depthOf(feetOf(own.frame, grid(1), where), own.widthPx, where.floor, own.share)
    expect(fits).toBe(false)
    for (const spot of grid(1)) {
      const foot = footsOf(own.frame, depthPx, 102, where)(spot.dx, spot.dy)
      expect(foot).toBeGreaterThanOrEqual(100)
      expect(foot).toBeLessThanOrEqual(104)
    }
  })
  it('has no step as the settlement or the room grows', () => {
    const steps = (values: number[], most: number) => values.slice(1).forEach((value, i) => expect(Math.abs(value - values[i]), `${i}`).toBeLessThan(most))
    steps(Array.from({ length: 700 }, (_, i) => depth(.1 + i / 100, room(60, 108, 6)).depthPx), 1)
    steps(Array.from({ length: 400 }, (_, i) => depth(1.2, room(60 + i / 8, 108, 14)).depthPx), .6)
  })
  it('leaves the dot where it is when there is room', () => {
    const feet = (top: number) => feetOf(at(.64).frame, grid(.64), room(top))
    expect(dotYOf(feet(60), 20, 88, 108)).toBe(88)
    expect(dotYOf(feet(85), 20, 70, 108)).toBeGreaterThan(85)
  })
})

describe('the count', () => {
  it('is the radical law\'s, and is held to the ellipse', () => {
    const small = at(.64, .5), large = at(1.5, 1.5)
    const { depthPx } = depthOf(feetOf(small.frame, grid(.64, .5), room(50)), small.widthPx, 108, 1)
    const few = drawnCount(130, small, depthPx)
    expect(few).toBeGreaterThan(50)
    expect(few).toBeLessThan(90)
    expect(drawnCount(260, small, 8)).toBeLessThanOrEqual(Math.PI / 4 * small.widthPx * 8 / small.housePx ** 2)
    expect(drawnCount(894, large, 23)).toBeCloseTo(Math.PI / 4 * large.widthPx * 23 / large.housePx ** 2, 6)
  })
  it('never draws more than there are', () => expect(drawnCount(10, at(.2), 14)).toBeLessThanOrEqual(10))
})
import { describe, expect, it } from 'vitest'
import { frameOfBox, outsideProject } from '../../data/city/outsideView'
import type { SettlementSource } from '../../data/village/settlement'
import { FRAME_SCALE } from '../outside'
import { villageFrame } from './frame'
import { widthOf } from './room'
import { isVillageSpot, villageShare } from './share'

const W = 375
/** A settlement this wide and deep, the place at its middle (or at `at` of its width). */
const settlement = (wide: number, deep = wide, at = .5, kind: SettlementSource['kind'] = 'cells') => ({ kind, spots: [], rows: [],
  group: { w: -wide * at, e: wide * (1 - at), s: -deep / 2, n: deep / 2, extentKm: Math.max(wide, deep), houses: 100 } }) as unknown as SettlementSource
const townOf = (wide: number) => frameOfBox({ w: -wide / 2, e: wide / 2, s: -wide / 2, n: wide / 2 }, 12, W / 2, W, true, FRAME_SCALE)
const frameOf = (wide: number, deep = wide) => villageFrame(settlement(wide, deep), townOf(wide), W)
const KM = Array.from({ length: 800 }, (_, i) => .1 + i / 100)

describe('the village\'s share', () => {
  it('is all of a village, none of a town, and never rises with width', () => {
    expect([.1, 1, 2].map(villageShare)).toEqual([1, 1, 1])
    expect([5, 8, 30].map(villageShare)).toEqual([0, 0, 0])
    KM.slice(1).forEach((km, i) => {
      const fall = villageShare(KM[i]) - villageShare(km)
      expect(fall).toBeGreaterThanOrEqual(0)
      expect(fall).toBeLessThan(.0105)
    })
  })
  it('hands spots over one by one, and none back', () => {
    const own = (share: number) => Array.from({ length: 500 }, (_, i) => i * 7919).filter(seed => isVillageSpot(seed, share))
    expect(own(0)).toHaveLength(0)
    expect(own(1)).toHaveLength(500)
    expect(Math.abs(own(.5).length - 250)).toBeLessThan(40)
    expect(own(.6)).toEqual(expect.arrayContaining(own(.5)))
  })
})

describe('the frame', () => {
  it('is the town\'s own object from five kilometres on', () => {
    for (const wide of [5, 6, 12]) {
      const town = townOf(wide)
      expect(villageFrame(settlement(wide), town, W).frame).toBe(town)
    }
  })
  it('gives 0.6 km a third of the width, a hamlet the same scale, and no more than a side has', () => {
    expect(widthOf(.6, .3, W)).toBeCloseTo(125, 6)
    expect(widthOf(.3, .15, W)).toBeCloseTo(62.5, 6)
    expect(widthOf(1.5, .75, W)).toBeCloseTo(145.4, 0)
    expect(widthOf(4, 4, W)).toBeCloseTo(.45 * W, 6)
  })
  it('puts the group\'s edges that far apart, at the middle depth', () => {
    const { frame, widthPx } = frameOf(.64, .5)
    const x = (dx: number) => outsideProject(frame, dx, (frame.s + frame.n) / 2).x
    expect(x(frame.w) - x(frame.e)).toBeCloseTo(widthPx, 6)
    expect(outsideProject(frame, 0, 0).x).toBe(W / 2)
  })
  it.each([['width', (f: ReturnType<typeof frameOf>) => f.widthPx, 2.5], ['scale', f => f.ppm * 1000, 3.5], ['house', f => f.housePx, .12],
    ['depth of the box', f => f.deepKm * 100, 2.5], ['eye', f => f.frame.eyeN * 10, .6]] as [string, (f: ReturnType<typeof frameOf>) => number, number][])(
    'has no step in its %s as a settlement grows by ten metres', (_, of, most) => {
      const at = KM.map(km => of(frameOf(km)))
      at.slice(1).forEach((value, i) => expect(Math.abs(value - at[i]), `${KM[i]} km`).toBeLessThan(most))
    })
  it('gives a single street a depth', () => {
    const street = frameOf(.5, 0)
    expect(street.deepKm).toBeGreaterThan(.1)
    expect(Number.isFinite(outsideProject(street.frame, 0, 0).near)).toBe(true)
  })
})
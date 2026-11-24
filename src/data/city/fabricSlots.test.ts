import { expect, it } from 'vitest'
import { composeBodies, standingSites, type FabricSite } from './fabricSlots'

const HOUSE_TOP_M = 12.5
const site = (x: number, foot: number, near: number, heightM: number, siteW: number, bodyW: number): FabricSite => {
  const body = { x, w: bodyW, foot, top: foot - .3 * heightM, near, kind: 'mass' as const, heightM }
  return { box: { ...body, w: siteW }, slotW: 0, body }
}

it('leaves every house of a low-rise row on its site', () => {
  const row = [100, 101.5, 103, 104.5].map((x, i) => site(x, 100 + .1 * i, .5 + .01 * i, 7.7, 5, 5))
  expect(composeBodies(row, HOUSE_TOP_M)).toEqual(row.map(s => s.body))
})

it('leaves out only blocks drawn wider than their sites, behind another such block', () => {
  const front = site(100, 100, .8, 25, 1, 9), hidden = site(100.2, 99, .7, 20, 1, 8)
  const own = site(100, 99.2, .72, 25, 8, 8), house = site(100, 99.5, .78, 7.7, 5, 5)
  expect(composeBodies([hidden, house, own, front], HOUSE_TOP_M)).toEqual([house.body, front.body, own.body])
})

it('never lets a block at its own width, or a farther one, take a widened block', () => {
  const widened = site(101, 99, .7, 25, 1, 6)
  expect(composeBodies([widened, site(101, 100, .8, 40, 12, 12)], HOUSE_TOP_M)).toHaveLength(2)
  // Painted over it by its foot, though it stands farther.
  expect(composeBodies([widened, site(101, 100, .6, 40, 1, 12)], HOUSE_TOP_M)).toHaveLength(2)
})

it('keeps one legible house per slot, the one nearest its middle', () => {
  const at = (x: number) => ({ ...site(x, 100, .5, 7.7, 5, 5), slotW: 5 })
  const middle = at(99), edge = at(101)
  expect(standingSites([edge, middle])).toEqual([middle])
  expect(standingSites([edge, middle, at(104.5)])).toHaveLength(2)
})

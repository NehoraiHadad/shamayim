import { expect, it } from 'vitest'
import { composeBodies, standingSites, type FabricSite } from './fabricSlots'

const HOUSE_TOP_M = 12.5
const site = (x: number, foot: number, near: number, heightM: number, siteW: number, bodyW: number): FabricSite => {
  const body = { x, w: bodyW, foot, top: foot - .3 * heightM, near, kind: 'mass' as const, heightM }
  return { box: { ...body, w: siteW }, slotW: 0, body }
}

it('leaves every house of a low-rise row on its site', () => {
  const row = [100, 101.5, 103, 104.5].map((x, i) => site(x, 100 + .1 * i, .5 + .01 * i, 7.7, 5, 5))
  expect(composeBodies(row, 5, HOUSE_TOP_M)).toEqual(row.map(s => s.body))
})

it('lets a widened block take only the blocks on the ground it covers', () => {
  const near = site(100, 100, .8, 25, 1, 9), covered = site(102, 99, .7, 25, 1, 9)
  const beside = site(103, 100, .75, 25, 1, 9), rowBehind = site(100, 94, .4, 25, 1, 9), house = site(102, 99.5, .78, 7.7, 5, 5)
  expect(composeBodies([covered, near, beside, rowBehind, house], 5, HOUSE_TOP_M))
    .toEqual([near.body, beside.body, rowBehind.body, house.body])
})

it('gives way to a block that stands at its own width', () => {
  const own = site(100, 100, .5, 25, 9, 9), widened = site(102, 100, .8, 25, 1, 9)
  expect(composeBodies([widened, own], 5, HOUSE_TOP_M)).toEqual([own.body])
})

it('keeps one legible house per slot, the one nearest its middle', () => {
  const at = (x: number) => ({ ...site(x, 100, .5, 7.7, 5, 5), slotW: 5 })
  const middle = at(99), edge = at(101)
  expect(standingSites([edge, middle])).toEqual([middle])
  expect(standingSites([edge, middle, at(104.5)])).toHaveLength(2)
})

import { expect, it } from 'vitest'
import { composeSettlement, type SettlementInput, type SettlementSize, type SettlementStyle } from './settlement'
import { templateRows } from './settlementPlan'

const fixtures: [SettlementSize, SettlementStyle, number, number, number][] = [
  ['small', 'tile', 375, 68, .08],
  ['medium', 'tile', 625, 77, -.7],
  ['large', 'blocks', 375, 72, .12],
  ['medium', 'flat-hill', 375, 96, -.1],
  ['small', 'flat-desert', 375, 111, .03],
  ['large', 'blocks', 550, 101, .75],
]

it.each(fixtures)('preserves the %s %s template at width %i, y %i, slope %f', (size, style, width, centerY, slope) => {
  const centerX = width / 2
  const input: SettlementInput = {
    size, style, width, centerX, centerY, ground: x => centerY + (x - centerX) * slope,
    litShare: .4, seed: 42, floor: 121,
    keepOut: [{ left: centerX + 35, right: centerX + 45, top: 56, bottom: 90 }],
    absorbed: [{ x: centerX - 16, w: 9, base: centerY, kind: 'waterTower' }],
  }
  const defaultComposition = composeSettlement(input)
  expect(defaultComposition).toMatchSnapshot()
  expect(composeSettlement(input, templateRows(input))).toEqual(defaultComposition)
})

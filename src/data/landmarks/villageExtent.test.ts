import { expect, it } from 'vitest'
import type { Cluster, Extent } from '../city/clusterTypes'
import { seat } from './seat'
import { composeSettlement, type SettlementInput } from './settlement'
import { ROW_STEP } from './settlementPlan'
import { villageRows, villageWidth } from './villageExtent'

function footprint(dx: Extent, bands: Cluster['bands']): Cluster {
  return { id: 42, dx, dy: [-2, 2], centre: { dx: 0, dy: 0 }, nearest: .1, urban: false,
    squares: 12, measured: 12, shareSum: 24, levels: 2, upper: 6, bands,
    form: { size: 3, big: 0, pitched: 0, flat: 0, evidence: 0 } }
}
const band = (dy: number, ...runs: Extent[]) => ({ dy, runs, big: [] })
const centerX = 187.5
const input: SettlementInput = { centerX, centerY: 72, width: 375, style: 'tile', size: 'small',
  ground: x => 72 + .2 * (x - centerX), floor: 106, seed: 42, litShare: .4 }

// The final table entry rounds 82.878 px to a whole pixel.
it.each([[.3, 30], [.6, 30], [1, 36], [1.4, 42.6], [1.9, 49.6], [2.34, 55.1], [2.7, 59.2], [3.5, 67.3], [5.3, 82.88]])(
  'uses the width law for %f km', (km, px) => {
    expect(Math.abs(villageWidth(km) - px)).toBeLessThan(.1)
    expect(villageWidth(km, 750)).toBe(villageWidth(km) * 2)
  },
)

it('preserves true width above the lens cap', () => {
  expect(villageWidth(6)).toBe(93.75)
})

it('keeps an east-edge dot east of the village and clears the crest gap beside the dot', () => {
  const home = footprint([-2.7, 0], [band(0, [-2.7, 0])])
  const settlement = composeSettlement(input, villageRows(home, input.style, input))
  expect(settlement.houses.length).toBeGreaterThan(2)
  for (const house of settlement.houses) {
    expect(house.row).toBe(0)
    expect(house.x + house.w / 2).toBeLessThanOrEqual(centerX - 6)
  }
})

it('uses the true projection and a dot-anchored lens while preserving gaps and depth', () => {
  const bands = [band(.751, [-2, -.8]), band(.75, [.5, 2]), band(-.75, [.5, 2]), band(-.751, [-2, -.8])]
  const home = footprint([-2, 2], bands)
  const shifted = { width: 550, centerX: 273 }
  const plan = villageRows(home, input.style, shifted)
  const lens = villageWidth(4) / (4 * 15.625)
  expect(plan.map(row => row.row)).toEqual([0, 1, 2])
  const x = (dx: number) => shifted.centerX + lens * ((187.5 + dx * 15.625) * shifted.width / 375 - shifted.centerX)
  for (const row of plan) {
    const [left, right] = row.row === 1 ? [.5, 2] : [-2, -.8]
    const centers = row.centers(() => { throw new Error('Expected the geographic seed') })
    expect(centers.length).toBeGreaterThan(1)
    expect(centers.every(px => px >= x(left) && px <= x(right))).toBe(true)
  }
})

it('steps the rows down the face like the template and respects the floor, keep-out and label clearance', () => {
  const home = footprint([-2, 2], [band(1, [-2, -.5]), band(0, [-2, 2]), band(-1, [.5, 2])])
  const plan = villageRows(home, input.style, input)
  const settlement = composeSettlement(input, plan)
  expect([...new Set(settlement.houses.map(house => house.row))]).toEqual([0, 1, 2])
  for (const house of settlement.houses) {
    expect(house.baseY).toBe(seat(input.ground, house.x, house.w, house.row * ROW_STEP.tile, true)?.baseY)
  }
  const keepOut = [{ left: centerX, right: 375, top: 0, bottom: 110 }]
  const guarded = composeSettlement({ ...input, keepOut, floor: 70 }, plan)
  expect(guarded.houses.length).toBeGreaterThan(0)
  for (const house of guarded.houses) {
    const box = house
    expect(box.x + box.w / 2).toBeLessThan(centerX - 2)
    expect(box.baseY).toBeLessThanOrEqual(70)
    if (box.x + box.w / 2 > centerX - 25) expect(box.baseY + 2).toBeLessThanOrEqual(guarded.labelTop)
  }
})

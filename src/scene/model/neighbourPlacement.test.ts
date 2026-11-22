import { expect, it } from 'vitest'
import { GLYPH_SPECS } from '../../world/glyphSpecs'
import { HOME_GAP_PX, MAX_NEIGHBOUR_SLIDE_PX, placeNeighbour, TOWN_SIDE_PX } from './neighbourPlacement'
import type { WorldMark } from '../../world/markGeometry'

const home = { left: 100, right: 120, hazeKm: 2 }
const block = { x: 135, w: 30, top: 98, foot: 100, hazeKm: 4 }
const mark = (glyphKind = 'minaret'): WorldMark => ({ glyphKind, base: 100, h: 4, scale: 1, w: 4 } as WorldMark)

it.each(Object.keys(GLYPH_SPECS))
('keeps the nearest separated position within the source block for %s', kind => {
  const placed = placeNeighbour(mark(kind), 126, block, home, () => true)!
  expect(placed.x).toBe(128)
  expect(placed.bounds.left - home.right).toBe(HOME_GAP_PX)
  expect(placed.bounds.left - (block.x - block.w / 2)).toBeGreaterThanOrEqual(TOWN_SIDE_PX)
  expect(block.x + block.w / 2 - placed.bounds.right).toBeGreaterThanOrEqual(TOWN_SIDE_PX)
  expect(placed.x - 126).toBeLessThanOrEqual(MAX_NEIGHBOUR_SLIDE_PX)
})

it('requires a pixel of the proven source block on both sides of the whole glyph', () => {
  expect(placeNeighbour(mark(), 135, { ...block, w: 4 }, home, () => true)).toBeNull()
  expect(placeNeighbour(mark(), 135, undefined, home, () => true)).toBeNull()
  expect(placeNeighbour(mark(), 135, { ...block, top: 100 }, home, () => true)).toBeNull()
  expect(placeNeighbour(mark(), 135, { ...block, foot: 99 }, home, () => true)).toBeNull()
})

it('culls when the nearest valid source position exceeds the bounded slide', () => {
  expect(placeNeighbour(mark(), 126, { ...block, w: 80 }, home, bounds => bounds.left >= 137)).toBeNull()
})

it('never moves toward the home group, even if only that side is clear', () => {
  expect(placeNeighbour(mark(), 140, { ...block, w: 80 }, home, bounds => bounds.right <= 140)).toBeNull()
})

it('requires the surrounding town to survive the actual foot visibility check', () => {
  expect(placeNeighbour(mark(), 135, block, home, () => false)).toBeNull()
})

it('can establish a visible town when the home roofline is absent', () => {
  expect(placeNeighbour(mark(), 135, block, null, () => true)?.x).toBe(135)
})

it('chooses the exact fractional gap boundary rather than rounding the slide to a grid', () => {
  expect(placeNeighbour(mark(), 126, block, { ...home, right: 120.13 }, () => true)?.x).toBeCloseTo(128.13, 8)
})

it('finds a valid supporting strip narrower than a quarter-pixel search step', () => {
  const narrow = { ...block, x: 135.1, w: 6.05 }
  expect(placeNeighbour(mark(), 135, narrow, home, () => true)?.x).toBeCloseTo(135.075, 6)
})

it('can move either way from the exact home centre, choosing the nearest supported side', () => {
  const centred = { ...home, left: 100, right: 104 }
  const leftTown = { ...block, x: 92, w: 20 }
  expect(placeNeighbour(mark(), 102, leftTown, centred, () => true)?.x).toBe(92)
})

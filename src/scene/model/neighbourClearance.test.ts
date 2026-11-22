import { expect, it } from 'vitest'
import type { WorldMark } from '../../world/markGeometry'
import type { WorldState } from '../../world/types'
import { neighbourClearance } from './neighbourClearance'
import { placeNeighbour } from './neighbourPlacement'

const mark = { base: 100, h: 4, scale: 1, w: 4, km: 8 } as WorldMark
const home = { left: 100, right: 120, hazeKm: 2 }
const block = { x: 160, w: 50, top: 99, foot: 100, hazeKm: 4 }
const world = (points: number[][]) => ({ place3: { kind: 'unknown' }, terrain: {
  near: { points, distanceKm: points.map(() => 2) },
} }) as unknown as WorldState

it('finds the exact visible position at a sloping ridge crossing, including both side strips', () => {
  const given = world([[0, 110], [100.03, 90], [200.03, 110], [375, 110]])
  const clear = neighbourClearance(given, 375, mark, [], [])
  const placed = placeNeighbour(mark, 142, block, home, clear.visible, () => clear.boundaries)!
  // The ridge crosses y=100 at x=150.03; a 2 px glyph half-width plus 1 px strip must clear it.
  expect(placed.x).toBeCloseTo(153.03, 6)
})

it('finds the exact text edge above the support without moving the underlying town', () => {
  const clear = neighbourClearance(world([[0, 110], [375, 110]]), 375, mark,
    [{ x: 140, y: 96, w: 3.13, h: 1 }], [])
  const placed = placeNeighbour(mark, 142, block, home, clear.visible, () => clear.boundaries)!
  expect(placed.x).toBeCloseTo(145.13, 6)
})

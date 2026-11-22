import { expect, it } from 'vitest'
import type { PlacedMark } from '../data/landmarks/types'
import { evaluateNeighbour } from '../scene/model/evaluateNeighbour'
import { DOT_R, SHEET_CLEAR, VISIBLE_BOTTOM } from './layout'
import { fit } from './markFitting'
import type { MarksInput } from './marks'
import type { WorldState } from './types'

const terrain = { horizonY: 60, nearPoints: [[0, 120], [375, 120]], farPoints: [[0, 90], [375, 90]] }
const input = { dot: { x: 187.5, y: 100 }, width: 375, terrain, style: 'tile' } as unknown as MarksInput
const mark = (layer: PlacedMark['layer'], x: number, base: number) => ({ id: 'famous', kind: 'castle',
  glyph: 'castle', landmark: true, sightKm: 12, km: 12, layer, hPx: 1.5, baseY: base, sourceGroundY: base,
  bearingX: x, xPct: x / 375 * 100, dy: 0, lights: 0, tall: false }) as PlacedMark
const fitted = (m: PlacedMark) => fit(m, input, () => 120, () => 90)
it.each(['near', 'far', 'plain'] as const)('nudges a famous %s glyph off the dot', layer => {
  const result = fitted(mark(layer, input.dot.x, input.dot.y))!
  expect(result.x - result.w / 2).toBeGreaterThanOrEqual(input.dot.x + DOT_R + 1 - 1e-10)
})
it.each(['near', 'far', 'plain'] as const)('keeps the same bounded sheet lift for a famous %s glyph', layer => {
  const result = fitted(mark(layer, 80, VISIBLE_BOTTOM - SHEET_CLEAR + 3))!
  expect(result.base).toBe(VISIBLE_BOTTOM - SHEET_CLEAR)
  const world = { place3: { kind: 'unknown' }, terrain: { horizonY: 60,
    near: { points: [[0, 120], [375, 120]], distanceKm: [1, 1] } } } as unknown as WorldState
  const received = evaluateNeighbour(world, result, 375, null, null, [], [], 'far')
  expect(received.placed!.mark.base).toBe(VISIBLE_BOTTOM - SHEET_CLEAR)
  expect(fitted(mark(layer, 80, VISIBLE_BOTTOM - SHEET_CLEAR + 7))).toBeNull()
})

it('cannot regain a base below sheet clearance through the receiving ridge exception', () => {
  const result = fitted(mark('far', 80, VISIBLE_BOTTOM - SHEET_CLEAR + 3))!
  const world = { place3: { kind: 'unknown' }, terrain: { horizonY: 60,
    near: { points: [[0, 109], [375, 109]], distanceKm: [1, 1] } } } as unknown as WorldState
  expect(evaluateNeighbour(world, { ...result, sourceTopY: 108 }, 375, null, null, [], [], 'far').placed)
    .toBeNull()
})

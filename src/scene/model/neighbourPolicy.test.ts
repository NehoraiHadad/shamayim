import { LEGIBLE_PX, NEIGHBOUR_MIN_TRUE_PX } from '../../world/neighbourSize'
import { expect, it } from 'vitest'
import type { WorldMark } from '../../world/markGeometry'
import type { WorldState } from '../../world/types'
import { evaluateNeighbour } from './evaluateNeighbour'
import { evaluateFarNeighbour } from './farNeighbourMarks'
import { farMasses, massAt } from './markOcclusion'
import type { LayerOf } from './types'

const world = { place3: { kind: 'unknown' }, terrain: {
  horizonY: 70, near: { points: [[0, 110], [375, 110]], distanceKm: [2, 2] },
}, farCities: { footprints: new Map([[7, { townId: 1, built:
  1 }]]) } } as unknown as WorldState
const mark = { id: 'source', kind: 'castle', glyphKind: 'castle', base: 101, h: 3, scale: 1,
  w: 16 * 3 / 9.5, x: 140, km: 12, sightKm: 12, plane: 'near', townFootprint: false } as WorldMark
const home = { left: 100, right: 120, hazeKm: 2 }
const support = { id: 'town-1', x: 140, w: 30, top: 98, foot: 100, hazeKm: 11 }
const evaluate = (m = mark, s: typeof support | null | undefined = null, masses = [], roof = home) =>
  evaluateNeighbour(world, m, 375, s, roof, [], masses)

it('keeps an unseated standalone near landmark and shades at true distance, independent of its factor', () => {
  const result = evaluate()
  expect(result.reason).toBe('kept')
  expect(result.placed!.mark.h * result.placed!.mark.scale).toBeCloseTo(LEGIBLE_PX, 8)
  expect(result.factor).toBeCloseTo(LEGIBLE_PX / mark.h, 8)
  const expectedHaze = 2 * 1.22 ** Math.floor(Math.log(12 / 2) / Math.log(1.22)) * 1.1
  expect(result.hazeKm).toBe(expectedHaze)
  expect(result.hazeKm).not.toBe(2 * 1.22 ** Math.floor(Math.log(12 / result.factor! / 2) / Math.log(1.22)) * 1.1)
})

it('culls the true sub-2 px source even when its foot and gap are clear', () => {
  expect(evaluate({ ...mark, h: NEIGHBOUR_MIN_TRUE_PX - .01 }).reason).toBe('exaggeration-cap')
})

it('anchors an off-base town mark to its painted support and excludes that support by id', () => {
  const masses = [massAt(140, 30, 98, 11, 'town-1')]
  const result = evaluateNeighbour(world, mark, 375, support, home, [], masses)
  expect(result.reason).toBe('kept')
  expect(result.placed!.mark.base).toBe(100)
  expect(evaluateNeighbour(world, mark, 375, support, home, [],
    [massAt(140, 30, 98, 11, 'different-town')]).placed).toBeNull()
})

it('checks town side margins against the enlarged box', () => {
  // A 3 px true castle is 5.05 px wide, the 4 px drawing is 6.74 px wide: only the former would fit.
  expect(evaluate(mark, { ...support, w: 8 }).placed).toBeNull()
})

it('uses the enlarged box for the exact six-pixel home gap', () => {
  const result = evaluate({ ...mark, x: 129 })
  expect(result.placed!.bounds.left - home.right).toBeCloseTo(6, 8)
  expect(result.placed!.x).toBeGreaterThan(129)
})

it('rejects a source with lighter haze than home', () => {
  const result = evaluate(mark, null, [], { ...home, hazeKm: 50 })
  expect(result.reason).toBe('home-haze')
  expect(result.placed).toBeNull()
})

it('keeps far standalone landmarks but rejects missing town mass for worship or mapped fabric', () => {
  const far = { ...mark, plane: 'far' as const, sourceGroundY: 100 }
  expect(evaluateFarNeighbour(world, far, 375, null, home, [], []).placed).not.toBeNull()
  expect(evaluateFarNeighbour(world, { ...far, townFootprint: true }, 375, null, home, [], []).reason)
    .toBe('missing-town-mass')
  expect(evaluateFarNeighbour(world, { ...far, glyphKind: 'church' }, 375, null, home, [], []).reason)
    .toBe('policy-hidden')
  const hidden = [massAt(140, 30, 98, 50)]
  hidden[0].alwaysInFront = true
  expect(evaluateFarNeighbour(world, far, 375, null, home, [], hidden).placed).toBeNull()
})

it(("uses only its own final painted far-city ground, with self-mass exclusion and " +
    "other foreground intact"), () => {
  const towns = { tiers: [{ km: 11, blocks: [], mass: [{ alpha: 1,
    boxes: [{ x: 125, y: 99.5, w: 30, h: .5, km: 11, townId: 1 }] }] }] } as unknown as LayerOf<'farCities'>
  const far = { ...mark, plane: 'far' as const, sourceGroundY: 100, townFootprint: true, farCellId: 7 }
  const result = evaluateFarNeighbour(world, far, 375, towns, home, [], farMasses(towns))
  expect(result.reason).toBe('kept')
  expect(result.supportId).toBe('far-town:1')
  expect(evaluateFarNeighbour(world, far, 375, towns, home, [],
    [...farMasses(towns), massAt(140, 30, 98, 8, 'other')]).placed).toBeNull()
})

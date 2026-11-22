import { expect, it } from 'vitest'
import type { WorldMark } from '../../world/markGeometry'
import type { WorldState } from '../../world/types'
import { neighbourRule } from '../../world/neighbourPolicy'
import { evaluateNeighbour } from './evaluateNeighbour'
import { massAt } from './markOcclusion'

const world = { place3: { kind: 'unknown' }, terrain: { horizonY: 70,
  near: { points: [[0, 100], [375, 100]], distanceKm: [2, 2] } } } as unknown as WorldState
const mark = { id: 'famous', kind: 'castle', glyphKind: 'castle', named: true, base: 99, h: .8,
  scale: 1, w: 1, x: 140, km: 12, sightKm: 12, plane: 'far', townFootprint: false } as WorldMark
const home = { left: 100, right: 120, hazeKm: 2 }
const evaluate = (m = mark, masses: ReturnType<typeof massAt>[] = [], missingTown = false) =>
  evaluateNeighbour(world, m, 375, missingTown ? undefined : null, home, [], masses, 'far')

it('keeps a famous 5x landmark with true-distance haze and a six-pixel home gap', () => {
  const result = evaluate({ ...mark, x: 129 })
  expect(result.reason).toBe('kept')
  expect(result.factor).toBe(5)
  expect(result.placed!.mark.h * result.placed!.mark.scale).toBe(4)
  expect(result.placed!.bounds.left - home.right).toBeCloseTo(6, 7)
  expect(result.hazeKm).toBeCloseTo(2 * 1.22 ** 9 * 1.1)
  expect(result.placed!.mark.baseMode).toBe('foot')
})
it('culls an ordinary castle needing 3x', () => {
  expect(evaluate({ ...mark, named: false, h: 4 / 3 }).placed).toBeNull()
})
it.each(['minaret', 'mosque', 'great-masjid'])('bans even a famous %s', kind => {
  expect(neighbourRule(kind, true)).toBe('hidden')
  if (kind === 'minaret') expect(evaluate({ ...mark, glyphKind: kind }).placed).toBeNull()
})
it.each(['church', 'synagogue', 'westernWall', 'babShrine'])('bans generic non-own %s', glyphKind => {
  expect(evaluate({ ...mark, named: false, h: 8, glyphKind } as WorldMark).placed).toBeNull()
})
const behindRidge = { ...mark, base: 105, sourceGroundY: 105, sourceTopY: 99.2, bearingX: 140 }
it('stands on drawn terrain when the physical foot is hidden but true top is above it, without town mass', () => {
  const result = evaluate(behindRidge, [], true)
  expect(result.reason).toBe('kept')
  expect(result.placed!.mark.baseMode).toBe('ridge')
  expect(result.placed!.mark.base).toBe(100)
  expect(result.trueHeightPx).toBeCloseTo(.8)
  expect(result.factor).toBeCloseTo(5)
  expect(result.supportId).toBe('ridge:near')
  expect(result.town).toBe(true)
})
it('rejects a true top below the ridge even when enlargement would make it legible', () => {
  expect(evaluate({ ...behindRidge, sourceTopY: 101 }).placed).toBeNull()
})
it('rejects a famous landmark hidden only by buildings or home roofs', () => {
  expect(evaluate(mark, [massAt(140, 80, 90, 1)]).placed).toBeNull()
  expect(evaluateNeighbour(world, mark, 375, null, { left: 50, right: 200, hazeKm: 2 }, [], [], 'far')
    .placed).toBeNull()
})
it('keeps other foreground in front of a ridge-supported icon', () => {
  expect(evaluate(behindRidge, [massAt(140, 80, 90, 1)], true).placed).toBeNull()
})
it('requires drawn town mass when the foot is visible', () => {
  expect(evaluate(mark, [], true).placed).toBeNull()
})

it('cannot lift a physically hidden top onto a visible town support', () => {
  const support = { id: 'own-town', x: 140, w: 30, top: 98, foot: 99, hazeKm: 11 }
  expect(evaluateNeighbour(world, { ...behindRidge, sourceTopY: 101 }, 375, support, home, [], [], 'far')
    .placed).toBeNull()
})
it('follows a sloping drawn ridge at the final bounded slide', () => {
  const slope = { ...world, terrain: { ...world.terrain,
    near: { points: [[0, 90], [375, 110]], distanceKm: [2, 2] } } } as unknown as WorldState
  const m = { ...behindRidge, x: 129, bearingX: 129, sourceTopY: 95, sourceGroundY: 105 }
  const result = evaluateNeighbour(slope, m, 375, undefined, home, [], [], 'far')
  expect(result.placed).not.toBeNull()
  expect(result.placed!.x).toBeGreaterThan(129)
  expect(result.placed!.mark.base).toBeCloseTo(90 + result.placed!.x * 20 / 375, 8)
  expect(result.placed!.bounds.left - home.right).toBeCloseTo(6, 7)
})

it('uses finite drawn land only: never invents a ridge by extending its endpoint', () => {
  const finite = { ...world, place3: { kind: 'outside', land: { km: 1, top: [[160, 90], [170, 90]] } },
    terrain: { ...world.terrain, near: { points: [[0, 110], [375, 110]], distanceKm: [2, 2] } } } as unknown as WorldState
  const m = { ...behindRidge, x: 152, bearingX: 152, sourceTopY: 85 }
  expect(evaluateNeighbour(finite, m, 375, undefined, home, [], [], 'far').placed).toBeNull()
  const result = evaluateNeighbour(finite, { ...m, x: 165, bearingX: 165 }, 375, undefined, home, [], [], 'far')
  expect(result.placed!.mark.baseMode).toBe('ridge')
  expect(result.placed!.mark.ridgeKind).toBe('land')
  expect(result.placed!.mark.base).toBe(90)
})

it('keeps ordinary non-own marks on the round-5 visible-foot rule', () => {
  expect(evaluate({ ...behindRidge, named: false, h: 2.5, sourceTopY: 98 }).placed).toBeNull()
})

it('never carries a town seam allowance onto another terrain line in ridge mode', () => {
  const other = { ...world, place3: { kind: 'outside', land: { km: 1,
    top: [[0, 110], [137, 99.5], [140, 100.2], [143, 99.5], [375, 110]] } } } as unknown as WorldState
  const seated = { ...behindRidge, seatBlockId: 'town', seatRank: 1 } as WorldMark
  const walls = [massAt(68, 136, 90, 1), massAt(259.5, 231, 90, 1)]
  expect(evaluateNeighbour(other, seated, 375, undefined, home, [], walls, 'far').placed).toBeNull()
})

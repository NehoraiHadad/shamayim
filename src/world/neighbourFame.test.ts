import { expect, it } from 'vitest'
import { placeMarks } from '../data/landmarks/placeMarks'
import type { Landmark, MarkPerspective } from '../data/landmarks/types'
import type { SceneTerrain } from '../data/terrain/terrain'
import { evaluateNeighbour } from '../scene/model/evaluateNeighbour'
import type { WorldState } from './types'
import type { MarksInput } from './marks'
import { fit } from './markFitting'
import { LANDMARK_MIN_PX } from './neighbourSize'
import { beyondMarks } from './beyondMarks'

const place = { id: 'test', nameHe: 'Test', regionHe: '', timezone: 'UTC', lat: 0, lon: 0 }
const terrain = { centerLeft: '50%', horizonY: 60, nearPoints: [[0, 100], [375, 100]],
  farPoints: [[0, 80], [375, 80]], nearElevations: [20, 20], farElevations: [20, 20] } as SceneTerrain
function candidate(kind: Landmark['kind'], fame: 1 | 2, truePx: number) {
  const source: Landmark = { id: `${kind}-${fame}`, kind, fame, nameHe: 'Named source', source: 'osm',
    heightM: 30, lat: 0, lon: .01 }
  const perspective: MarkPerspective = () => ({ hPx: truePx, crestPx: truePx, km: 4, sightKm: 4,
    heightM: 30, supportBlockId: 'town', townFootprint: true })
  const placed = placeMarks(place, terrain, [source], 375, 0, false, undefined, [], 'landmark', perspective)
  return placed[0] && fit(placed[0], { dot: { x: 300, y: 100 }, width: 375, terrain, style: 'tile' } as MarksInput,
    () => 100, () => 80)
}
it('hides a named fame-1 synagogue before selection', () => {
  expect(candidate('synagogue', 1, 8)).toBeUndefined()
})
it('culls a named fame-1 tower needing 3x before selection', () => {
  expect(candidate('waterTower', 1, 4 / 3)).toBeUndefined()
})
it('keeps a named fame-2 church at the icon floor through selection, fitting and receiving', () => {
  const mark = candidate('church', 2, .8)!
  expect(mark).toBeDefined()
  expect(mark.named).toBe(true)
  const world = { place3: { kind: 'unknown' }, terrain: { horizonY: 60,
    near: { points: [[0, 110], [375, 110]], distanceKm: [1, 1] } } } as unknown as WorldState
  const support = { id: 'town', x: mark.x, w: 30, top: 99, foot: 100, hazeKm: 3 }
  const result = evaluateNeighbour(world, mark, 375, support, null, [], [])
  expect(result.reason).toBe('kept')
  expect(result.factor).toBeCloseTo(LANDMARK_MIN_PX / .8, 8)
  expect(result.placed!.mark.baseMode).toBe('foot')
})

it('keeps a viable fame-1 tower ordinary in its transported flag', () => {
  const mark = candidate('waterTower', 1, 3)!
  expect(mark).toBeDefined()
  expect(mark.named).toBe(false)
})
it('uses the same fame predicate for the seat pool, without panorama-frame evidence', () => {
  const marks = [{ kind: 'synagogue', fame: 1, px: 8 }, { kind: 'highrise', fame: 1, px: 4 / 3 },
    { kind: 'church', fame: 2, px: .8 }] as const
  const sources: Landmark[] = marks.map(m => ({ id: m.kind, kind: m.kind, fame: m.fame, nameHe: 'Named',
    source: 'osm', heightM: 30, lat: 0, lon: .01 }))
  const { seatPool } = beyondMarks(place, sources, 375, source => ({ x: 140, base: 100, km: 4, blockId: 'town',
    hPx: marks.find(m => m.kind === source.kind)!.px }), { x: 300, y: 100 }, [])
  expect(seatPool.map(m => m.id)).toEqual(['church'])
  expect(seatPool[0]).toMatchObject({ named: true, base: 100 })
  expect(seatPool[0].sourceTopY).toBeUndefined()
  expect(seatPool[0].sourceGroundY).toBeUndefined()
  expect(seatPool[0].bearingX).toBeUndefined()
})

import { expect, it } from 'vitest'
import { placeMarks } from '../data/landmarks/placeMarks'
import type { Landmark, MarkPerspective } from '../data/landmarks/types'
import type { SceneTerrain } from '../data/terrain/terrain'
import { beyondMarks } from './beyondMarks'
import { LEGIBLE_PX, NEIGHBOUR_MIN_TRUE_PX } from './neighbourSize'

const place = { id: 'test', nameHe: 'Test', regionHe: '', timezone: 'UTC', lat: 0, lon: 0 }
const small = NEIGHBOUR_MIN_TRUE_PX * .75
const visible = (NEIGHBOUR_MIN_TRUE_PX + LEGIBLE_PX) / 2
const terrain: SceneTerrain = { centerLeft: '50%', horizonY: 60, seaInView: false,
  seaSide: null, nearPoints: [[0, 60], [375, 60]], farPoints: [[0, 40], [375, 40]],
  nearElevations: [20, 20], farElevations: [20, 20] }

it('removes sub-floor candidates before they can fill the five selection slots ahead of a visible castle', () => {
  const castle: Landmark = { id: 'castle', kind: 'castle', heightM: 12, lat: 0, lon: .01, source: 'osm' }
  const decoys: Landmark[] = Array.from({ length: 5 }, (_, i) => ({ id: `decoy-${i}`,
    kind: 'castle', heightM: 200,
    lat: 0, lon: -.01 + i * .004, source: 'osm' }))
  const perspective: MarkPerspective = m => ({ hPx: m.id === castle.id ? visible : small,
    km: 4, sightKm: 4, heightM: m.heightM, supportBlockId: m.id })
  const placed = placeMarks(place, terrain, [...decoys, castle], 375, 0, false,
    undefined, 'landmark', perspective)
  expect(placed.map(m => m.id)).toEqual(['castle'])
})

it('does not let two doomed towers consume the two-kind seat budget ahead of a viable tower', () => {
  const marks: Landmark[] = [0, 1, 2].map(i => ({ id: `${i}`, kind: 'highrise', source: 'osm',
    heightM: i === 2 ? 17 : 200, lat: 0, lon: .001 * i }))
  const result = beyondMarks(place, marks, 375, m => ({ x: 40 + Number(m.id) * 60,
    base: 100, hPx: m.id === '2' ? visible : small, km: 4, blockId: m.id }), { x: 300, y: 100 })
  expect(result.seatPool.map(m => m.id)).toEqual(['2'])
  expect(result.seated.map(m => m.id)).toEqual(['2'])
})

it('offers a famous sub-floor landmark while rejecting even a famous mosque before selection', () => {
  const sources: Landmark[] = ['castle', 'minaret'].map((kind, i) => ({ id: `famous-${i}`, kind,
    nameHe: 'Named', fame: 2, source: 'osm', heightM: 12, lat: 0, lon: .01 })) as Landmark[]
  const perspective: MarkPerspective = () => ({ hPx: .8, km: 4, sightKm: 4, heightM: 12, supportBlockId: 'source' })
  expect(placeMarks(place, terrain, sources, 375, 0, false, undefined, 'landmark', perspective)
    .map(m => m.id)).toEqual(['famous-0'])
})

it('carries an uncapped famous seat before budget selection, while vetoing a famous mosque', () => {
  const marks = ['church', 'minaret'].map((kind, i) => ({ id: `seat-famous-${i}`, kind, source: 'osm',
    fame: 2, nameHe: 'Named', heightM: 12, lat: 0, lon: .01 })) as Landmark[]
  const result = beyondMarks(place, marks, 375, () => ({ x: 40, base: 100, hPx: .8, km: 4, blockId: 'town' }),
    { x: 300, y: 100 })
  expect(result.seatPool.map(m => m.id)).toEqual(['seat-famous-0'])
})

import { expect, it } from 'vitest'
import { SHADMOT_MEHOLA } from '../../../config/place'
import { hashId } from '../../../data/landmarks/hash'
import { placeHomes } from '../../../data/landmarks/placeMarks'
import { composeSettlement } from '../../../data/landmarks/settlement'
import type { CityColumns } from '../../../data/city/types'
import { GENERIC_TERRAIN } from '../../../data/terrain/terrain'
import { hillScene } from './hillScene'
import { VISIBLE_BOTTOM } from './sceneLayout'

const terrain = { ...GENERIC_TERRAIN, nearPoints: [[0, 75], [375, 75]] as [number, number][] }
const place = { ...SHADMOT_MEHOLA, id: 'test-village', settlementType: 'village', featureCode: 'PPL' }
const city: CityColumns = { west: 34.6, span: .25, rows: [0, 1, 2].map(() =>
  Array.from({ length: 188 }, () => ({ built: .8, measured: .8, levels: 4, upper: 16 }))) as CityColumns['rows'] }

it('keeps the fallback settlement byte-for-byte, even with surrounding city data', () => {
  const input = { place, terrain, landmarks: placeHomes(place), placed: [], width: 375, litShare: .5,
    label: { text: '80 מ׳', below: false } }
  const expected = composeSettlement({ style: 'tile', size: 'small', width: 375, ground: () => 75,
    centerX: 187.5, centerY: 75, litShare: .5, seed: hashId(place.id), floor: VISIBLE_BOTTOM - 2, keepOut: [], absorbed: [] })
  expect(JSON.stringify(hillScene(input).settlement)).toBe(JSON.stringify(expected))
  expect(JSON.stringify(hillScene({ ...input, city }).settlement)).toBe(JSON.stringify(expected))
})

it('replaces a large settlement with data-driven blocks across the ridge', () => {
  const large = { ...place, id: 'test-city', settlementType: 'city', population: 100_000 }
  const input = { place: large, terrain, landmarks: placeHomes(large), placed: [], width: 375, litShare: .5,
    label: { text: '80 מ׳', below: false } }
  expect(hillScene(input).settlement?.halfWidth).toBeLessThan(70)
  const fabric = hillScene({ ...input, city }).settlement
  expect(fabric?.style).toBe('blocks')
  expect(fabric?.contours).toEqual([])
  expect(fabric?.halfWidth).toBeGreaterThan(140)
})

import { expect, it } from 'vitest'
import { parseOverpass } from './overpass'

it.each([
  ['plain mosque', { building: 'mosque' }, 'minaret', 9],
  ['Muslim place of worship', { amenity: 'place_of_worship', religion: 'muslim' }, 'minaret', 9],
  ['minaret tower', { 'tower:type': 'minaret' }, 'minaret', 30],
  ['minaret building', { building: 'minaret' }, 'minaret', 30],
  ['mosque with a tagged height', { building: 'mosque', height: '22', 'building:levels': '3' }, 'minaret', 22],
  ['mosque with three levels', { building: 'mosque', 'building:levels': '3' }, 'minaret', 9.6],
  ['church', { building: 'church', amenity: 'place_of_worship' }, 'church', 9],
  ['church with tower evidence', { building: 'church', amenity: 'place_of_worship', man_made: 'tower' }, 'church', 25],
  ['church with a tagged height below 40 m', { building: 'church', amenity: 'place_of_worship', height: '28' }, 'church', 28],
  ['church tagged 45 m stays highrise', { building: 'church', amenity: 'place_of_worship', man_made: 'tower', height: '45' }, 'highrise', 45],
  ['synagogue', { building: 'synagogue', amenity: 'place_of_worship', religion: 'jewish' }, 'synagogue', 9],
  ['synagogue tagged as a tower', { building: 'synagogue', amenity: 'place_of_worship', religion: 'jewish', man_made: 'tower' }, 'synagogue', 30],
])('classifies a %s by its height evidence', (_case, tags, kind, heightM) => {
  const marks = parseOverpass({ elements: [{ id: 1, lat: 32, lon: 35, tags }] })
  expect(marks).toHaveLength(1)
  expect(marks[0].kind).toBe(kind)
  expect(marks[0].heightM).toBeCloseTo(heightM)
})

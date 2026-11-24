import { describe, expect, it } from 'vitest'
import { ALONE, CORNER, STREET, storedGroup, storedTile } from '../../test/villageTile'
import { decodeHouses, encodeHouses } from './houseCode'
import { sizeClassOf } from './settlement'
import { readTile } from './tile'

const parsed = (value: unknown) => readTile(JSON.parse(JSON.stringify(value)))

describe('a house\'s three bytes', () => {
  it('are these bytes', () => {
    expect(encodeHouses([{ x: 1, y: 2, across: true, size: 3, outline: true }])).toBe('AQjw')
    expect(encodeHouses([{ x: 0, y: 0, across: false, size: 0, outline: false }])).toBe('AAAA')
  })
  it('come back as they went, to the box\'s corner', () => {
    const houses = [...STREET, ALONE, { x: 1023, y: 1023, across: false, size: 3 as const, outline: false }]
    expect(decodeHouses(encodeHouses(houses))).toEqual(houses)
  })
  it.each([[-1, 0], [0, 1024], [.5, 0], [Number.NaN, 0]])('refuse %d, %d steps', (x, y) =>
    expect(() => encodeHouses([{ x, y, across: false, size: 0, outline: false }])).toThrow(RangeError))
  it.each(['', 'AQ==', 'AQjwAA==', '***'])('are not read from %j', text => expect(decodeHouses(text)).toBeNull())
})

it('sizes a footprint by its area, a limit in its own class', () =>
  expect([30, 120, 120.1, 250, 600, 601].map(sizeClassOf)).toEqual([0, 0, 1, 1, 2, 3]))

describe('a tile', () => {
  it('is read', () => {
    const tile = parsed(storedTile())!
    expect(tile).toMatchObject({ licence: 'ODbL-1.0', release: '2026-11-18.0', built: '2026-11-24' })
    expect(tile.groups).toEqual([{ corner: CORNER, places: [[31.6003, 35.1003]], osmShare: .9, rows: [3], houses: [...STREET, ALONE] }])
  })
  it('may hold no group', () => expect(parsed(storedTile({ groups: [] }))!.groups).toEqual([]))
  it('may hold a ring', () => {
    const ring = Array.from({ length: 8 }, (_, x) => ({ ...ALONE, x }))
    expect(parsed(storedTile({ groups: [storedGroup({ r: [-8], h: encodeHouses(ring) })] }))!.groups[0].rows).toEqual([-8])
  })

  it.each([
    ['nothing', null], ['a page in its place', '<!doctype html>'], ['a list', []],
    ['another version', { ...storedTile(), v: 2 }],
    ['no licence', { ...storedTile(), licence: undefined }],
    ['another licence', { ...storedTile(), licence: 'CC0-1.0' }],
    ['another licence\'s link', { ...storedTile(), licenceUrl: 'https://example.com' }],
    ['no credit', storedTile({ credits: [] })],
    ['an empty credit', storedTile({ credits: [''] })],
    ['a day that is none', storedTile({ built: '2026-13-40' })],
    ['no release', { ...storedTile(), release: 7 }],
    ['no groups', { ...storedTile(), groups: undefined }],
  ])('is none from %s', (_, raw) => expect(readTile(raw)).toBeNull())

  it.each([
    ['a corner off the globe', { o: [131, 35] }], ['a corner of one number', { o: [31] }], ['no place', { p: [] }],
    ['a place that is none', { p: [[31, null]] }], ['a share above one', { s: 1.2 }], ['a row of one', { r: [1] }],
    ['a ring of three', { r: [-3] }], ['rows longer than its houses', { r: [3, 2] }], ['half a house', { h: 'AQjwAA==' }],
    ['no house', { h: '' }],
  ])('is none when one of its groups has %s', (_, bad) => {
    expect(readTile({ ...storedTile(), groups: [storedGroup(), { ...storedGroup(), ...bad }] })).toBeNull()
  })
})

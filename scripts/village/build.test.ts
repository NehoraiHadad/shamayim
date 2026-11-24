import { describe, expect, it } from 'vitest'
import { footprintSettlement } from '../../src/data/village/footprintSource'
import { LAT_M, lonM } from '../../src/data/village/houseCode'
import { readTile, type LatLon } from '../../src/data/village/tile'
import { faultsOf, lostPlaces, sizeFaults, TILE_LIMIT, type Counts, type Pin } from './gates'
import { MICROSOFT, OSM, type Facts, type RawGroup, type RawHouse } from './input'
import { recordOf } from './record'
import { verdictOf } from './rule'
import { tileKeysOf, tilesOf } from './tiles'
import { textsOf } from './write'

const ORIGIN: LatLon = [31.64, 35.04]
const point = (east: number, north: number): LatLon => [ORIGIN[0] + north / LAT_M, ORIGIN[1] + east / lonM(ORIGIN[0])]
const house = (east: number, north: number, dataset = OSM, angle = 0, area = 150): RawHouse =>
  [...point(east, north), 15, 10, angle, area, dataset]
/** A street of houses 30 m apart, running east. */
const street = (count: number, step = 30, dataset = OSM): RawHouse[] => Array.from({ length: count }, (_, i) => house(i * step, 0, dataset))
const group = (houses: RawHouse[], places: LatLon[] = [point(0, 0)]): RawGroup => ({ places, houses })

describe('the rule', () => {
  it('takes a village drawn by people', () => expect(verdictOf(group(street(10)))).toBe('good'))
  it('leaves nine houses to the cells', () => expect(verdictOf(group(street(9)))).toBe('few'))
  it('leaves what is wider than two kilometres', () => {
    expect(verdictOf(group(street(100, 20)))).toBe('good')
    expect(verdictOf(group(street(102, 20)))).toBe('wide')
  })
  it('takes OSM\'s half, and leaves less', () => {
    expect(verdictOf(group([...street(5), ...street(5, 20, MICROSOFT)]))).toBe('good')
    expect(verdictOf(group([...street(5), ...street(6, 20, MICROSOFT)]))).toBe('machine')
  })
})

describe('a record', () => {
  const lone = house(0, 300)
  const tileOf = (raw: RawGroup) => readTile(JSON.parse(JSON.stringify([...tilesOf([raw], 'r', '2026-11-24').values()][0])))!
  it('is what the app reads: rows first, the lone house after', () => {
    const tile = tileOf(group([lone, ...street(10)]))
    expect(tile.groups[0].rows).toEqual([10])
    const found = footprintSettlement(tile, { lat: ORIGIN[0], lon: ORIGIN[1] })!
    const metres = found.spots.map(s => [Math.round(s.dx * 1000 / 5) * 5, Math.round(s.dy * 1000 / 5) * 5])
    expect(metres.slice(0, 10).map(([x]) => x).sort((a, b) => a - b)).toEqual([0, 30, 60, 90, 120, 150, 180, 210, 240, 270])
    expect(metres[10]).toEqual([0, 300])
  })
  it('puts a house within two metres of where it stands', () => {
    const raw = group([...street(10, 31.3), house(400, 777)])
    const found = footprintSettlement(tileOf(raw), { lat: ORIGIN[0], lon: ORIGIN[1] })!
    const last = found.spots.at(-1)!
    expect(Math.hypot(last.dx * 1000 - 400, last.dy * 1000 - 777)).toBeLessThan(2)
  })
  it.each([[0, true], [44, true], [46, false], [90, false], [134, false], [136, true], [180, true]])('a long side at %d°', (angle, across) =>
    expect(tileOf(group([house(0, 500, OSM, angle), ...street(9, 100)])).groups[0].houses.find(h => h.y > 200)!.across).toBe(across))
  it('keeps every house, once', () => expect(tileOf(group([lone, ...street(40, 25)])).groups[0].houses).toHaveLength(41))
  it('says OSM\'s share', () => expect(recordOf(group([...street(9), house(0, 60, MICROSOFT)])).s).toBe(.9))
})

describe('the tiles', () => {
  it('credit only whose footprints they hold', () => {
    const credits = (houses: RawHouse[]) => [...tilesOf([group(houses)], 'r', '2026-11-24').values()][0].credits
    expect(credits(street(10))).toEqual(['© OpenStreetMap contributors, Overture Maps Foundation'])
    expect(credits([...street(9), house(0, 60, MICROSOFT)])).toHaveLength(2)
    expect(() => credits([...street(9), house(0, 60, 'Someone')])).toThrow('Someone')
  })
  it('hold a group in every tile its places can stand in', () => {
    const at = (lat: number, lon: number): RawGroup => ({ places: [[lat, lon]], houses: [[lat, lon, 10, 10, 0, 100, OSM]] })
    expect(tileKeysOf(at(31.65, 35.05))).toEqual(['316_350'])
    expect(tileKeysOf(at(31.65, 35.0995))).toEqual(['316_350', '316_351'])
  })
  it('keep their day while they say the same', () => {
    const on = (day: string, houses = street(10)) => tilesOf([group(houses)], 'r', day)
    const day = (tiles: ReturnType<typeof on>, before: ReturnType<typeof on>) => (JSON.parse([...textsOf(tiles, before).values()][0]) as { built: string }).built
    expect(day(on('2026-11-24'), on('2026-10-01'))).toBe('2026-10-01')
    expect(day(on('2026-11-24', street(11)), on('2026-10-01'))).toBe('2026-11-24')
  })
})

describe('the gates', () => {
  const counts: Counts = { buildings: 1000, kept: 900, osm: 400, microsoft: 600, groups: 100, places: 110, houses: 800, tiles: 20 }
  const pin: Pin = { release: 'r', box: [], minAreaM2: 30, tolerance: .03, expected: counts }
  const facts = { keptDatasets: { [OSM]: 1, [MICROSOFT]: 1 }, partSources: 0 } as unknown as Facts
  it('let a build through that changed little', () => expect(faultsOf({ ...counts, houses: 820 }, facts, pin)).toEqual([]))
  it.each(Object.keys(counts) as (keyof Counts)[])('stop a change of %s, up or down', name => {
    for (const times of [.9, 1.1]) expect(faultsOf({ ...counts, [name]: counts[name] * times }, facts, pin)).toHaveLength(1)
  })
  it('stop a count that is no number, or with nothing to be held to', () => {
    expect(faultsOf({ ...counts, houses: NaN }, facts, pin)).toHaveLength(1)
    expect(faultsOf(counts, facts, { ...pin, expected: null })).toHaveLength(1)
  })
  it('stop a dataset of unknown licence', () =>
    expect(faultsOf(counts, { ...facts, keptDatasets: { ...facts.keptDatasets, 'Google Open Buildings': 1 } }, pin)).toHaveLength(1))
  it('stop villages lost in a steady count', () => {
    const places = (from: number) => new Set(Array.from({ length: 100 }, (_, i) => `${from + i}`))
    expect(lostPlaces(places(0), places(3), .03)).toEqual([])
    expect(lostPlaces(places(0), places(4), .03)).toHaveLength(1)
  })
  it('stop a tile too large', () => expect(sizeFaults(new Map([['a', TILE_LIMIT], ['b', TILE_LIMIT + 1]]))).toHaveLength(1))
})

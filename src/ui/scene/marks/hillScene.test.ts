import { expect, it } from 'vitest'
import { SHADMOT_MEHOLA } from '../../../config/place'
import { hashId } from '../../../data/landmarks/hash'
import { placeHomes } from '../../../data/landmarks/placeMarks'
import { composeSettlement } from '../../../data/landmarks/settlement'
import type { PlacedMark } from '../../../data/landmarks/types'
import { GENERIC_TERRAIN } from '../../../data/terrain/terrain'
import { hillScene } from './hillScene'
import { VISIBLE_BOTTOM } from './sceneLayout'
import { readFileSync } from 'node:fs'
import type { Place } from '../../../config/place'
import { findClusters } from '../../../data/city/clusters'
import { cellsForBand, computeColumns } from '../../../data/city/columns'
import { COLS, decodeRuns, squareOf } from '../../../data/city/grid'
import { homeCluster, homeTier } from '../../../data/city/homeCluster'
import type { CityCell, CityColumns, CityIndex } from '../../../data/city/types'
import type { SceneTerrain } from '../../../data/terrain/terrain'

const terrain = { ...GENERIC_TERRAIN, nearPoints: [[0, 75], [375, 75]] as [number, number][] }
const place = { ...SHADMOT_MEHOLA, id: 'test-village', settlementType: 'village', featureCode: 'PPL' }
const city: CityColumns = { west: 34.6, span: .25, towers: [], rows: [0, 1, 2].map(() =>
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

it('replaces generic near highrises only when the city fabric is active', () => {
  const large = { ...place, id: 'test-city', settlementType: 'city', population: 100_000 }
  const generic: PlacedMark = { id: 'osm-highrise', kind: 'highrise', glyph: 'highrise', layer: 'near',
    xPct: 40, baseY: 75, hPx: 22, lights: 0, tall: true, dy: 0 }
  const hand: PlacedMark = { ...generic, id: 'haifa-sail', kind: 'custom', glyph: 'haifa-sail', xPct: 70 }
  const data = { ...city, towers: [{ dx: 2, dy: 0, heightM: 100, wClass: 1 as const, lat: 32, lon: 34.9 }] }
  const input = { place: large, terrain, landmarks: placeHomes(large), placed: [generic, hand], width: 375,
    litShare: .5, label: { text: '80 מ׳', below: false } }
  const fallback = hillScene(input)
  expect(fallback.cityTowers).toEqual([])
  expect(fallback.marks.map(mark => mark.id)).toContain(generic.id)
  const scene = hillScene({ ...input, city: data })
  expect(scene.cityTowers).toMatchObject([{ x: 218.75, h: 22, row: 1 }])
  expect(scene.marks.map(mark => mark.id)).toEqual([hand.id])
})

const root = 'public/data/city/il/'
function cityAt(place: Place) {
  const index = JSON.parse(readFileSync(root + 'index.json', 'utf8')) as CityIndex
  const grids = new Map<string, Uint8Array>()
  const places = cellsForBand(place).filter(key => index.cells.includes(key)).flatMap(key => {
    const cell = JSON.parse(readFileSync(root + key + '.json', 'utf8')) as CityCell
    grids.set(key, decodeRuns(cell.r, cell.v === 2 ? 3 : 2))
    return cell.v === 2 ? cell.p : []
  })
  return { ...computeColumns(place, grids), clusters: findClusters(place, grids, places) }
}

const snapshotTerrain: SceneTerrain = {
  near: '', far: '', centerLeft: '50%', centerY: 72, seaY: 105, seaInView: false, seaSide: null,
  nearPoints: [[0, 85], [120, 79], [187.5, 72], [255, 82], [375, 96]], farPoints: [[0, 54], [375, 54]],
}
const common = { nameHe: '', regionHe: '', timezone: 'Asia/Jerusalem', featureCode: 'PPL' }
const karmei: Place = { ...common, id: 'karmei-tzur', lat: 31.6047, lon: 35.1081, settlementType: 'village' }
const petah: Place = { ...common, id: 'petah-tikva', lat: 32.0871, lon: 34.8875, population: 255000 }

it.each([karmei, petah])('preserves the pre-V3 house list for $id', place => {
  const city = cityAt(place)
  if (place === karmei) expect(homeTier(homeCluster(city.clusters))).toBe('C')
  const scene = hillScene({ place, city, terrain: snapshotTerrain, landmarks: placeHomes(place), width: 375, litShare: .43,
    label: { text: '100', below: false } })
  expect(Boolean(scene.settlement?.detail)).toBe(place === petah)
  if (place === petah) expect(scene.neighbours).toEqual([])
  expect(scene.settlement?.houses.length).toBeGreaterThan(0)
  expect(scene.settlement?.houses).toMatchSnapshot()
})

it.each([
  ['nahalal', 32.69, 35.1967],
  ['yagur', 32.7414, 35.0764],
  ['kfar-vitkin', 32.3817, 34.8767],
  ['karmei-tzur', 31.6092, 35.1009],
])('composes mapped neighbours for %s', (id, lat, lon) => {
  const place: Place = { ...common, id, lat, lon, settlementType: 'village' }
  const city = cityAt(place)
  const { neighbours } = hillScene({ place, city, terrain: snapshotTerrain,
    landmarks: placeHomes(place), width: 375, litShare: .43, label: { text: '100', below: false } })
  expect(neighbours.length).toBeGreaterThan(0)
  if (id === 'nahalal') {
    expect(neighbours.some(mass => /מגדל העמק|migdal/i.test(mass.name ?? '') &&
      mass.houses.every(h => h.x > 187.5))).toBe(true)
    const { cell, row, col } = squareOf(32.68206, 35.15225)
    const cached = JSON.parse(readFileSync(root + cell + '.json', 'utf8')) as CityCell
    expect(cached.v === 2 && cached.p.some(p => p[5] === 'כפר יהושע')).toBe(true)
    expect(decodeRuns(cached.r, 3)[(row * COLS + col) * 3] >> 4).toBe(0)
  }
  if (id === 'yagur') {
    expect(city.clusters.find(c => c.place?.name === 'נשר')?.centre.dy).toBeGreaterThan(3)
    expect(neighbours.some(mass => mass.name === 'נשר')).toBe(false)
  }
  if (id === 'karmei-tzur') expect(neighbours.some(mass => mass.name === 'בית אומר' && mass.roof === 'flat')).toBe(true)
})

it('uses the Nahalal footprint for tier A and the original template for tier B', () => {
  const nahalal: Place = { ...common, id: 'nahalal', lat: 32.69, lon: 35.1967, settlementType: 'village' }
  const city = cityAt(nahalal)
  const home = homeCluster(city.clusters)!
  expect(homeTier(home)).toBe('A')
  const input = { place: nahalal, terrain: snapshotTerrain, landmarks: placeHomes(nahalal), width: 375,
    litShare: .43, label: { text: '100', below: false } }
  const mapped = hillScene({ ...input, city }).settlement!
  const template = hillScene(input).settlement!
  expect(mapped.style).toBe('tile')
  expect(mapped.houses.length).toBeGreaterThan(2)
  expect(mapped.houses).not.toEqual(template.houses)
  const sparse = { ...home, measured: 2 }
  expect(homeTier(sparse)).toBe('B')
  expect(hillScene({ ...input, city: { ...city, clusters: [sparse] } }).settlement).toEqual(template)
})

it('draws Karmei Tzur from its 16 mapped squares at the OSM point, not the template', () => {
  const point = { ...karmei, id: 'osm:way:462664109', lat: 31.6092, lon: 35.1009 }
  const city = cityAt(point)
  const home = homeCluster(city.clusters)
  expect(homeTier(home)).toBe('A')
  expect(home?.measured).toBe(16)
  const input = { place: point, terrain: snapshotTerrain, landmarks: placeHomes(point), width: 375, litShare: .43,
    label: { text: '100', below: false } }
  const real = hillScene({ ...input, city }).settlement
  expect(real?.houses.length).toBeGreaterThan(0)
  expect(real).not.toEqual(hillScene(input).settlement)
})

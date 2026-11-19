import { describe, expect, it } from 'vitest'
import type { Place } from '../../config/place'
import type { SceneTerrain } from '../terrain/terrain'
import { withIcons } from './curated'
import { placeMarks, PORTRAIT_LANDMARKS } from './placeMarks'
import { bearingOf, groundY, markHeight, offsetKm, sightLayer, toX } from './project'
import { select, spread, type Candidate } from './rank'
import type { Landmark } from './types'

const jerusalem = { lat: 31.7690, lon: 35.2163 }
const telAviv = { lat: 32.0809, lon: 34.7806 }
const baseMark: Landmark = { id: 'm', kind: 'mast', lat: 0, lon: 0, heightM: 60, source: 'osm' }

describe('landmark projection', () => {
  it('projects the contract landmarks', () => {
    const chords = offsetKm(jerusalem, { lat: 31.7885, lon: 35.2004 })
    expect(chords.dx).toBeCloseTo(-1.51, 1)
    expect(chords.dy).toBeCloseTo(2.16, 1)
    // West of the place: on the right now that east is on the left (the mirror of 163.9).
    expect(Math.abs((toX(chords.dx)?.x ?? 0) - 211.1)).toBeLessThan(.15)
    const azrieli = offsetKm(telAviv, { lat: 32.0746, lon: 34.7916 })
    expect(azrieli.dx).toBeCloseTo(1.04, 1)
    expect(azrieli.dy).toBeCloseTo(-.70, 1)
    expect(Math.abs((toX(azrieli.dx)?.x ?? 0) - 171.2)).toBeLessThan(.15)
  })

  it('uses near and far scales and bounds', () => {
    expect(toX(0)).toEqual({ x: 187.5, layer: 'near' })
    // East (dx > 0) runs to the left edge, west to the right.
    expect(toX(12)).toEqual({ x: 0, layer: 'near' })
    expect(toX(30)).toEqual({ x: 0, layer: 'far' })
    expect(toX(-12)).toEqual({ x: 375, layer: 'near' })
    expect(toX(-30)).toEqual({ x: 375, layer: 'far' })
    expect(toX(13)?.layer).toBe('far')
    expect(toX(31)).toBeNull()
  })

  it('interpolates ground and clamps edges', () => {
    const samples = [{ x: 0, y: 40 }, { x: 375, y: 60 }]
    expect(groundY(samples, 187.5)).toBe(50)
    expect(groundY(samples, -1)).toBe(40)
    expect(groundY(samples, 400)).toBe(60)
  })

  it('maps landmark heights', () => {
    expect(markHeight(238)).toBe(34)
    expect(markHeight(118)).toBe(26)
    expect(markHeight(40)).toBe(19)
    expect(markHeight(5)).toBe(12)
    expect(markHeight(1000)).toBe(34)
    expect(markHeight(150, 'far')).toBe(17)
  })
})

const terrain: SceneTerrain = {
  centerLeft: '50%', seaY: 60, horizonY: 60, seaInView: false,
  seaSide: null,
  nearPoints: [[0, 60], [375, 60]], farPoints: [[0, 40], [375, 40]],
  nearElevations: [20, 20], farElevations: [20, 20],
}
const place: Place = { id: 'x', nameHe: 'מקום', regionHe: '', lat: 32, lon: 35, timezone: 'Asia/Jerusalem' }

describe('placement and selection', () => {
  it('applies source bands', () => {
    const atDy = (id: string, dy: number, source: Landmark['source']): Landmark => ({ ...baseMark, id, source,
      lat: place.lat + dy / 111.32, lon: place.lon })
    const marks = placeMarks(place, terrain, [atDy('osm-out', 1.6, 'osm'), atDy('reading', 2.75, 'curated'),
      atDy('curated-out', 5.6, 'curated')], 375)
    expect(marks.map((mark) => mark.id)).toEqual(['reading'])
  })

  it('drops a landmark sampled on water', () => {
    const wet = { ...terrain, nearElevations: [0, 0] }
    expect(placeMarks(place, wet, [{ ...baseMark, lat: place.lat, lon: place.lon }], 375)).toEqual([])
  })

  it('caps near and far counts and filters a short far mast', () => {
    const KINDS = ['highrise', 'chimney', 'cooling', 'waterTower', 'church', 'silo', 'castle', 'minaret', 'turbine'] as const
    const candidate = (index: number, layer: 'near' | 'far', heightM = 80): Candidate => ({
      mark: { ...baseMark, id: String(index), heightM, kind: KINDS[index % KINDS.length] }, dx: layer === 'far' ? 20 : index,
      dy: 0, x: 20 + index * 25, layer, width: 10, score: 20 - index,
    })
    expect(select(Array.from({ length: 9 }, (_, i) => candidate(i, 'near')), 375)).toHaveLength(5)
    expect(select(Array.from({ length: 9 }, (_, i) => candidate(i, 'near')), 675)).toHaveLength(7)
    const mixed = [...Array.from({ length: 4 }, (_, i) => candidate(i, 'far')), candidate(9, 'far', 40)]
    expect(select(mixed, 375).filter((item) => item.layer === 'far')).toHaveLength(2)
    expect(select([candidate(9, 'far', 40)], 375)).toEqual([])
  })

  it('caps repeated OSM kinds and prefers variety', () => {
    const minaret = (index: number): Candidate => ({ mark: { ...baseMark, id: `m${index}`, kind: 'minaret' }, dx: index,
      dy: 0, x: 20 + index * 25, layer: 'near', width: 10, score: 20 - index * .1 })
    const tower: Candidate = { ...minaret(9), mark: { ...baseMark, id: 'w', kind: 'waterTower' }, score: 15 }
    const picked = select([...Array.from({ length: 6 }, (_, i) => minaret(i)), tower], 375)
    expect(picked.filter((item) => item.mark.kind === 'minaret')).toHaveLength(2)
    expect(picked.map((item) => item.mark.id)).toContain('w')
  })

  it('spreads a city cluster around the village dot', () => {
    const candidates = [164, 195, 205, 214].map((x, i): Candidate => ({
      mark: { ...baseMark, id: String(i), source: 'curated' }, dx: 0, dy: 0, x,
      layer: 'near', width: 10, score: 10 - i,
    }))
    const result = spread(candidates, 3, [180.5, 194.5])
    expect(result.map((item) => item.x)).toEqual([...result.map((item) => item.x)].sort((a, b) => a - b))
    result.slice(1).forEach((item, i) => expect(item.x - result[i].x).toBeGreaterThanOrEqual(7))
    result.forEach((item) => {
      expect(Math.abs(item.x - candidates[Number(item.mark.id)].x)).toBeLessThanOrEqual(24)
      expect(item.x - item.width / 2 >= 194.5 || item.x + item.width / 2 <= 180.5).toBe(true)
    })
  })

  it.each([375, 520])('keeps the Azrieli icon and Tel Aviv\'s famous tower at %d px', (width) => {
    const city: Place = { ...place, id: 'tel-aviv', lat: 32.0809, lon: 34.7806 }
    const anonymous: Landmark = { ...baseMark, id: 'osm-spiral', kind: 'highrise', lat: 32.0758, lon: 34.7925, heightM: 350 }
    const shalom: Landmark = { ...baseMark, id: 'osm-shalom', kind: 'highrise', lat: 32.0642, lon: 34.7697, heightM: 130,
      nameHe: 'מגדל שלום מאיר', fame: 2 }
    const ids = placeMarks(city, terrain, withIcons(city, [anonymous, shalom]), width).map((mark) => mark.id)
    // The icon stands in for the anonymous tower at its spot; the famous one is drawn with the generic glyph.
    expect(ids).toEqual(expect.arrayContaining(['tel-aviv-azrieli', 'osm-shalom']))
    expect(ids).not.toContain('osm-spiral')
  })

  it.each([375, 520])('keeps the Báb among Haifa\'s famous marks at %d px', (width) => {
    const city: Place = { ...place, id: 'haifa', lat: 32.8130, lon: 34.9993 }
    const dagon: Landmark = { ...baseMark, id: 'osm-dagon', kind: 'highrise', lat: 32.8232, lon: 34.9948, heightM: 46.8, fame: 2 }
    const sail: Landmark = { ...baseMark, id: 'osm-sail', kind: 'highrise', lat: 32.8163, lon: 35.0028, heightM: 112.8, fame: 1 }
    const marks = placeMarks(city, terrain, withIcons(city, [dagon, sail]), width)
    expect(marks.map((mark) => mark.id)).toEqual(expect.arrayContaining(['haifa-bab', 'osm-dagon', 'osm-sail']))
    expect(marks.find((mark) => mark.id === 'haifa-bab')!.hPx).toBeGreaterThanOrEqual(10)
  })

  it('keeps clear of the notes written on the land', () => {
    // 8.8 km due west stands at x 325 on the old cross-section; a note (a water body's name) is written there.
    const onWestLabel = { ...baseMark, id: 'west', lat: place.lat,
      lon: place.lon - 8.8 / (111.32 * Math.cos(place.lat * Math.PI / 180)), heightM: 120 }
    const note = { left: 310, right: 340, top: 0, bottom: 128 }
    const kept = placeMarks(place, terrain, [onWestLabel], 375, undefined, false, undefined, [note])
    const free = placeMarks(place, terrain, [onWestLabel], 375)
    expect(free[0].xPct * 3.75).toBeCloseTo(325, 0)
    expect(kept[0]?.xPct * 3.75).not.toBeCloseTo(325, 0)
  })
})

describe('placement over a horizon panorama', () => {
  // Near ridge 3 km away all round; the far horizon 20 km away shows above it only on the eastern half.
  const panorama: SceneTerrain = { ...terrain, horizonY: 90,
    sightAt: (x) => ({ nearKm: 3, farKm: 20, farShows: x > 187.5 }) }
  const at = (id: string, km: number, azimuth: number, extra: Partial<Landmark> = {}): Landmark => ({ ...baseMark, id,
    lat: place.lat + km * Math.cos(azimuth * Math.PI / 180) / 111.32,
    lon: place.lon + km * Math.sin(azimuth * Math.PI / 180) / (111.32 * Math.cos(place.lat * Math.PI / 180)), ...extra })

  it('puts a mark at its true bearing: south in the middle, east and west towards the edges, north out of view', () => {
    expect(bearingOf(place, at('s', 2, 180))!.x).toBeCloseTo(187.5, 0)
    expect(bearingOf(place, at('e', 2, 90))!.x).toBeCloseTo(52.5, 0)
    expect(bearingOf(place, at('w', 2, 270))!.x).toBeCloseTo(322.5, 0)
    expect(bearingOf(place, at('n', 2, 0))).toBeNull()
  })

  it('stands a mark on the ridge in its own direction, or leaves it out when the land in front hides it', () => {
    expect(sightLayer(2.5, { nearKm: 3, farKm: 20, farShows: false })?.layer).toBe('near')
    expect(sightLayer(19, { nearKm: 3, farKm: 20, farShows: true })?.layer).toBe('far')
    expect(sightLayer(19, { nearKm: 3, farKm: 20, farShows: false })).toBeNull()
    expect(sightLayer(10, { nearKm: 3, farKm: 20, farShows: true })).toBeNull()
  })

  it('places marks off the old west–east band too, by bearing', () => {
    const marks = placeMarks(place, panorama, [at('south', 2.5, 170), at('north', 2, 10), at('hidden', 12, 260)], 375)
    expect(marks.map((mark) => mark.id)).toEqual(['south'])
    expect(marks[0].xPct / 100 * 375).toBeCloseTo(bearingOf(place, at('south', 2.5, 170))!.x, 0)
  })

  it('draws the place\'s own marks in its portrait by side: east of it on the left, west on the right, north too', () => {
    const portrait = { reachKm: 2 }
    const north = at('palms', 1.5, 350, { kind: 'palms', heightM: 15 })
    const east = at('orchard', 1.2, 95, { kind: 'orchard', heightM: 5 })
    const solar = at('solar', .6, 190, { kind: 'solar', heightM: 3 })
    const far = at('far', 3.5, 120, { kind: 'orchard', heightM: 5 })
    const placed = placeMarks(place, panorama, [north, east, solar, far], 375, undefined, false, portrait)
    const x = (id: string) => placed.find((mark) => mark.id === id)!.xPct / 100 * 375
    // North-north-west: west of the place, so on the right, though it is behind the viewer.
    expect(x('palms')).toBeGreaterThan(187.5)
    expect(x('orchard')).toBeLessThan(187.5)
    // Due south, a little west: right of the dot, nearer it than the farther palms.
    expect(x('solar')).toBeGreaterThan(187.5)
    expect(x('solar')).toBeLessThan(x('palms'))
    // Beyond the reach (fields: a km past the village's) the scene is true: at its own bearing.
    expect(placed.find((mark) => mark.id === 'far')!.portrait).toBeUndefined()
    // East-south-east: at its own bearing, left of the dot.
    expect(x('far')).toBeCloseTo(bearingOf(place, far)!.x, 0)
  })


  it('shows a portrait\'s few best-known landmarks, an icon first, and keeps them apart', () => {
    const portrait = { reachKm: 4 }
    const famous = Array.from({ length: 8 }, (_, i) => at(`church${i}`, .8 + i * .3, i % 2 ? 80 : 280,
      { kind: 'church', heightM: 25, fame: 2 }))
    const icon = at('icon', 1.5, 100, { kind: 'custom', glyph: 'haifa-bab', heightM: 11, source: 'curated', fame: 2 })
    const placed = placeMarks(place, panorama, [...famous, icon], 375, undefined, false, portrait)
    const landmarks = placed.filter((mark) => mark.landmark)
    expect(landmarks.length).toBeLessThanOrEqual(PORTRAIT_LANDMARKS)
    expect(landmarks.map((mark) => mark.id)).toContain('icon')
    const xs = placed.map((mark) => mark.xPct * 3.75).sort((a, b) => a - b)
    xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBeGreaterThanOrEqual(6))
  })
})

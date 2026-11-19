import { describe, expect, it } from 'vitest'
import type { Place } from '../../config/place'
import type { SceneTerrain } from '../terrain/terrain'
import { CURATED } from './curated'
import { placeMarks } from './placeMarks'
import { bearingOf, groundY, markHeight, offsetKm, sightLayer, toX } from './project'
import { score, select, spread, type Candidate } from './rank'
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
  near: '', far: '', centerLeft: '50%', centerY: 60, seaY: 60, seaInView: false,
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

  it.each([375, 520])('keeps iconic Tel Aviv marks at %d px', (width) => {
    const city: Place = { ...place, id: 'tel-aviv', lat: 32.0809, lon: 34.7806 }
    const marks = placeMarks(city, terrain, CURATED.find((item) => item.id === city.id)!.marks, width)
    const ids = marks.map((mark) => mark.id)
    expect(ids).toEqual(expect.arrayContaining(['tel-aviv-shalom', 'tel-aviv-azrieli']))
    // Azrieli Center stands east of Sarona: to its left.
    expect(ids.indexOf('tel-aviv-azrieli')).toBeLessThan(ids.indexOf('tel-aviv-sarona'))
    expect(ids).toHaveLength(4)
  })

  it('ranks Azrieli Center above Sarona', () => {
    const marks = CURATED.find((item) => item.id === 'tel-aviv')!.marks
    const sarona = marks.find((mark) => mark.id === 'tel-aviv-sarona')!
    const azrieli = marks.find((mark) => mark.id === 'tel-aviv-azrieli')!
    expect(score(azrieli, 0, 0, 3)).toBeGreaterThan(score(sarona, 0, 0, 3))
  })

  it.each([375, 520])('keeps the central Haifa trio at %d px', (width) => {
    const city: Place = { ...place, id: 'haifa', lat: 32.8130, lon: 34.9993 }
    const marks = placeMarks(city, terrain, CURATED.find((item) => item.id === city.id)!.marks, width)
    expect(marks.map((mark) => mark.id)).toEqual(expect.arrayContaining(['haifa-bab', 'haifa-dagon', 'haifa-sail']))
    expect(marks.find((mark) => mark.id === 'haifa-bab')!.hPx).toBeGreaterThanOrEqual(10)
  })

  it('uses the sea-side label box for collision avoidance', () => {
    // Drawn at x 50 for the old mirrored scene: it now stands at 325, under the west (right-hand) sea label.
    const onWestLabel = { ...baseMark, id: 'west', source: 'curated' as const,
      lat: place.lat, lon: place.lon, x: 50 }
    const west = placeMarks(place, { ...terrain, seaInView: true, seaSide: 'west' }, [onWestLabel], 375)
    const legacy = placeMarks(place, { ...terrain, seaInView: true, seaSide: null }, [onWestLabel], 375)
    expect(west[0].xPct * 3.75).not.toBe(325)
    expect(legacy[0].xPct * 3.75).toBe(325)
  })

  it('renders the Shadmot homes and synagogue as an 8 px hall', () => {
    const city: Place = { ...place, id: 'shadmot-mehola', lat: 32.348, lon: 35.535 }
    const marks = placeMarks(city, { ...terrain, centerLeft: '47.5%' },
      CURATED.find((item) => item.id === city.id)!.marks, 375)
    expect(marks.find((mark) => mark.id === 'shadmot-homes')?.hPx).toBe(8)
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

  it('keeps a curated village glyph by the dot, and one behind the viewer at its drawn spot', () => {
    const homes = at('homes', 0.3, 250, { kind: 'homes', source: 'curated', x: 170, heightM: 8 })
    const behind = at('palms', 2.4, 350, { kind: 'palms', source: 'curated', x: 160, heightM: 15 })
    const east = at('orchard', 2.4, 95, { kind: 'orchard', source: 'curated', x: 200, heightM: 5 })
    const placed = placeMarks(place, panorama, [homes, behind, east], 375)
    expect(placed.map((m) => m.id).sort()).toEqual(['homes', 'orchard', 'palms'])
    const x = (id: string) => placed.find((mark) => mark.id === id)!.xPct / 100 * 375
    // Drawn at 160 for the old mirrored scene: mirrored to 215. East is on the left.
    expect(x('palms')).toBeCloseTo(215, 0)
    expect(x('orchard')).toBeLessThan(75)
  })
})

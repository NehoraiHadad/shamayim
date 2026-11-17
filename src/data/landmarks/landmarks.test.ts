import { describe, expect, it } from 'vitest'
import type { Place } from '../../config/place'
import type { SceneTerrain } from '../terrain/terrain'
import { CURATED } from './curated'
import { placeMarks } from './placeMarks'
import { groundY, markHeight, offsetKm, toX } from './project'
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
    expect(Math.abs((toX(chords.dx)?.x ?? 0) - 163.9)).toBeLessThan(.15)
    const azrieli = offsetKm(telAviv, { lat: 32.0746, lon: 34.7916 })
    expect(azrieli.dx).toBeCloseTo(1.04, 1)
    expect(azrieli.dy).toBeCloseTo(-.70, 1)
    expect(Math.abs((toX(azrieli.dx)?.x ?? 0) - 203.8)).toBeLessThan(.15)
  })

  it('uses near and far scales and bounds', () => {
    expect(toX(0)).toEqual({ x: 187.5, layer: 'near' })
    expect(toX(12)).toEqual({ x: 375, layer: 'near' })
    expect(toX(30)).toEqual({ x: 375, layer: 'far' })
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
    const candidate = (index: number, layer: 'near' | 'far', heightM = 80): Candidate => ({
      mark: { ...baseMark, id: String(index), heightM }, dx: layer === 'far' ? 20 : index,
      dy: 0, x: 20 + index * 25, layer, width: 10, score: 20 - index,
    })
    expect(select(Array.from({ length: 9 }, (_, i) => candidate(i, 'near')), 375)).toHaveLength(5)
    expect(select(Array.from({ length: 9 }, (_, i) => candidate(i, 'near')), 675)).toHaveLength(7)
    const mixed = [...Array.from({ length: 4 }, (_, i) => candidate(i, 'far')), candidate(9, 'far', 40)]
    expect(select(mixed, 375).filter((item) => item.layer === 'far')).toHaveLength(2)
    expect(select([candidate(9, 'far', 40)], 375)).toEqual([])
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
    expect(ids.indexOf('tel-aviv-azrieli')).toBeGreaterThan(ids.indexOf('tel-aviv-sarona'))
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
  })

  it('uses the sea-side label box for collision avoidance', () => {
    const onWestLabel = { ...baseMark, id: 'west', source: 'curated' as const,
      lat: place.lat, lon: place.lon, x: 50 }
    const west = placeMarks(place, { ...terrain, seaInView: true, seaSide: 'west' }, [onWestLabel], 375)
    const legacy = placeMarks(place, { ...terrain, seaInView: true, seaSide: null }, [onWestLabel], 375)
    expect(west[0].xPct * 3.75).not.toBe(50)
    expect(legacy[0].xPct * 3.75).toBe(50)
  })

  it('renders the Shadmot homes and synagogue as an 8 px hall', () => {
    const city: Place = { ...place, id: 'shadmot-mehola', lat: 32.348, lon: 35.535 }
    const marks = placeMarks(city, { ...terrain, centerLeft: '47.5%' },
      CURATED.find((item) => item.id === city.id)!.marks, 375)
    expect(marks.find((mark) => mark.id === 'shadmot-homes')?.hPx).toBe(8)
  })
})

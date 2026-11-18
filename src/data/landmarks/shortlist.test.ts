import { describe, expect, it } from 'vitest'
import type { Place } from '../../config/place'
import type { SceneTerrain } from '../terrain/terrain'
import { placeMarks, withPlaceHomes } from './placeMarks'
import { shortlist } from './shortlist'
import type { Landmark } from './types'

const terrain: SceneTerrain = { near: '', far: '', centerLeft: '50%', centerY: 60, seaY: 60, seaInView: false,
  seaSide: null, nearPoints: [[0, 60], [375, 60]], farPoints: [[0, 40], [375, 40]],
  nearElevations: [20, 20], farElevations: [20, 20] }
const petah: Place = { id: 'petah-tikva', nameHe: 'פתח תקווה', regionHe: '', lat: 32.0871, lon: 34.8875,
  population: 255000, featureCode: 'PPL', timezone: 'Asia/Jerusalem' }
const tower = (id: string, heightM: number, lat: number, lon: number, nameHe?: string): Landmark => ({
  id, kind: 'highrise', heightM, lat, lon, nameHe, source: 'osm',
})
const towers = [tower('home-152', 152, 32.0916, 34.8631), tower('home-100', 100, 32.0943, 34.8705),
  tower('home-99', 99, 32.0952, 34.8705), tower('ta-238', 238, 32.0745, 34.7920, 'מגדל 238'),
  tower('ta-350', 350, 32.0758, 34.7925, 'מגדל 350'), tower('remote-400', 400, 30.9685, 35.0972),
  tower('unnamed-400', 400, 32.08, 34.80)]

describe('home-first highrises', () => {
  it('reserves Petah Tikva towers and rejects implausible unnamed supertalls', () => {
    const listed = shortlist(petah, towers)
    expect(listed.map((mark) => mark.id)).toContain('ta-350')
    expect(listed.map((mark) => mark.id)).not.toContain('unnamed-400')
    const placed = placeMarks(petah, terrain, withPlaceHomes(petah, listed), 375).map((mark) => mark.id)
    expect(placed).toEqual(expect.arrayContaining(['home-152', 'home-100']))
  })

  it('keeps the village cap at four highrises', () => {
    const village = { ...petah, id: 'village', population: 1000 }
    const nearby = Array.from({ length: 8 }, (_, i) => tower(`v${i}`, 80 + i, petah.lat, petah.lon + i * .002))
    const placed = placeMarks(village, terrain, withPlaceHomes(village, shortlist(village, nearby)), 375)
    expect(placed.filter((mark) => mark.kind === 'highrise').length).toBeLessThanOrEqual(4)
  })
})

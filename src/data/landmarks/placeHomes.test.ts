import { describe, expect, it } from 'vitest'
import type { Place } from '../../config/place'
import type { SceneTerrain } from '../terrain/terrain'
import { ICONS } from './curated'
import { placeHomes, placeMarks, withPlaceHomes } from './placeMarks'
import type { Landmark } from './types'

const place: Place = { id: 'x', nameHe: 'מקום', regionHe: '', lat: 32, lon: 35, timezone: 'Asia/Jerusalem' }
const baseMark: Landmark = { id: 'm', kind: 'mast', lat: 32, lon: 35, heightM: 60, source: 'osm' }
const terrain: SceneTerrain = {
  centerLeft: '50%', seaY: 60, horizonY: 60, seaInView: false, seaSide: null,
  nearPoints: [[0, 60], [375, 60]], farPoints: [[0, 40], [375, 40]],
  nearElevations: [20, 20], farElevations: [20, 20],
}

describe('place homes', () => {
  it('always adds Karmei Tzur homes alongside remote OSM marks', () => {
    const karmei: Place = { ...place, id: 'karmei-tzur', nameHe: 'כרמי צור', lat: 31.6092, lon: 35.1009,
      usesOsm: true, featureCode: 'PPL', settlementType: 'village' }
    expect(placeHomes(karmei)[0].glyph).toBe('homes-small')
    const minaret: Landmark = { ...baseMark, id: 'west-minaret', kind: 'minaret',
      lat: karmei.lat, lon: karmei.lon - 6 / (111.32 * Math.cos(karmei.lat * Math.PI / 180)) }
    const combined = withPlaceHomes(karmei, [minaret])
    expect(combined.map((mark) => mark.kind)).toEqual(['minaret', 'homes'])
    expect(combined[1].glyph).toBe('homes-small')
  })

  it("draws a large city's own blocks even when high-rises stand at its centre", () => {
    const city: Place = { ...place, featureCode: 'PPLA', settlementType: 'city' }
    expect(placeHomes(city)[0].glyph).toBe('homes-large')
    const tower = { ...baseMark, id: 'tower', kind: 'highrise' as const, lon: place.lon + .003, heightM: 120 }
    const marks = placeMarks(city, { ...terrain, centerLeft: '47%' }, [placeHomes(city)[0], tower], 375)
    expect(marks.find((mark) => mark.id === 'tower')?.absorbed).toBe(true)
  })

  it('leaves the place homes to the settlement cluster and keeps other marks out of it', () => {
    const homes = placeHomes({ ...place, featureCode: 'PPL' })[0]
    const nextToCentre = { ...baseMark, id: 'nearby', lat: place.lat, lon: place.lon + .001 }
    const marks = placeMarks(place, { ...terrain, centerLeft: '47%' }, [homes, nextToCentre], 375)
    expect(marks.find((mark) => mark.kind === 'homes')).toBeUndefined()
    const nearby = marks.find((mark) => mark.id === 'nearby')
    expect(nearby == null || Math.abs(nearby.xPct - 47) * 3.75 >= 27).toBe(true)
  })

  it('absorbs the own minaret of the place into the cluster, clear of the dot', () => {
    const homes = placeHomes({ ...place, featureCode: 'PPL' })[0]
    const minaret = { ...baseMark, id: 'own', kind: 'minaret' as const, lon: place.lon + .003, heightM: 25 }
    const marks = placeMarks(place, { ...terrain, centerLeft: '47%' }, [homes, minaret], 375)
    const own = marks.find((mark) => mark.id === 'own')!
    expect(own.absorbed).toBe(true)
    const offset = (own.xPct - 47) * 3.75
    expect(offset).toBeGreaterThan(6)
    expect(offset).toBeLessThan(27)
  })

  it.each(ICONS.map(({ mark }) => mark.id))('gives the city round the icon %s its own city blocks too', (id) => {
    const icon = ICONS.find(({ mark }) => mark.id === id)!.mark
    const city: Place = { ...place, id, lat: icon.lat, lon: icon.lon, featureCode: 'PPLA' }
    const marks = withPlaceHomes(city, [icon])
    expect(marks.slice(0, -1)).toEqual([icon])
    expect(marks.at(-1)).toMatchObject({ kind: 'homes', glyph: 'homes-large' })
  })
})

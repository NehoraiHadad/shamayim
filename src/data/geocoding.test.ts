import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../config/place'
import { mapGeocodingResult, mapNominatimResult, mergePlaceResults, searchPlaces, type NominatimResult } from './geocoding'

afterEach(() => vi.unstubAllGlobals())

describe('mapGeocodingResult', () => {
  it('maps Hebrew name, preferred region and coordinates', () => {
    expect(mapGeocodingResult({
      id: 281184,
      name: 'ירושלים',
      latitude: 31.77,
      longitude: 35.22,
      elevation: 754,
      timezone: 'Asia/Jerusalem',
      admin1: 'מחוז ירושלים',
      country: 'ישראל',
    })).toEqual({
      id: '281184',
      nameHe: 'ירושלים',
      regionHe: '',
      lat: 31.77,
      lon: 35.22,
      elevation: 754,
      timezone: 'Asia/Jerusalem',
    })
  })

  it('falls back from admin1 to country and a usable timezone', () => {
    const place = mapGeocodingResult({ id: 1, name: 'מקום', latitude: 1, longitude: 2, country: 'ישראל' })
    expect(place.regionHe).toBe('ישראל')
    expect(place.timezone).toBeTruthy()
  })
})

const nominatim = (overrides: Partial<NominatimResult> = {}): NominatimResult => ({
  osm_type: 'node', osm_id: 1, name: 'כרמי צור', lat: '31.6092242', lon: '35.1008772',
  category: 'place', type: 'village', addresstype: 'village', address: { state: 'יהודה ושומרון' },
  ...overrides,
})

describe('mapNominatimResult', () => {
  it('maps the Karmei Tzur village fixture', () => {
    expect(mapNominatimResult(nominatim({ extratags: { population: '1148' } }))).toMatchObject({
      id: 'osm:node:1', nameHe: 'כרמי צור', regionHe: 'גוש עציון',
      lat: 31.6092242, lon: 35.1008772, usesOsm: true, featureCode: 'PPL',
      settlementType: 'village', population: 1148,
    })
  })

  it('maps a city and drops a non-place result', () => {
    expect(mapNominatimResult(nominatim({ osm_id: 2, name: 'תל אביב-יפו', lat: '32.0809', lon: '34.7806',
      type: 'city', addresstype: 'city' })))
      .toMatchObject({ id: 'osm:node:2', lat: 32.0809, lon: 34.7806, featureCode: 'PPLA', settlementType: 'city' })
    expect(mapNominatimResult(nominatim({ category: 'tourism', type: 'attraction', addresstype: 'tourism' }))).toBeNull()
  })

  it('keeps a village OSM maps only as a residential area, and drops a footway of the same name', () => {
    const hever = nominatim({ osm_type: 'way', osm_id: 3, name: 'מעלה חבר', lat: '31.4858455', lon: '35.1651529',
      category: 'landuse', type: 'residential', addresstype: 'village' })
    expect(mapNominatimResult(hever)).toMatchObject({ nameHe: 'מעלה חבר', regionHe: 'הר חברון', settlementType: 'village' })
    expect(mapNominatimResult({ ...hever, category: 'highway', type: 'footway', addresstype: 'road' })).toBeNull()
  })
})

describe('mergePlaceResults', () => {
  const place = (id: string, nameHe: string, lat: number, lon: number): Place => ({
    id, nameHe, lat, lon, regionHe: '', timezone: 'Asia/Jerusalem',
  })

  it('keeps Open-Meteo first and deduplicates by name or two-kilometre proximity', () => {
    const open = [place('open', 'אפרת', 31.65, 35.15)]
    const osm = [place('same-name', 'אפרת', 32, 35), place('nearby', 'שם אחר', 31.651, 35.151),
      place('unique', 'כרמי צור', 31.6092, 35.1009)]
    expect(mergePlaceResults(open, osm).map(({ id }) => id)).toEqual(['open', 'unique'])
  })

  it('puts places in the land first: ערד in the Negev before ערד in Romania', () => {
    const open = [place('arad-ro', 'ערד', 46.18, 21.31), place('arad-il', 'ערד', 31.26, 35.21)]
    expect(mergePlaceResults(open, []).map(({ id }) => id)).toEqual(['arad-il', 'arad-ro'])
    expect(mergePlaceResults([open[0]], [open[1]]).map(({ id }) => id)).toEqual(['arad-il', 'arad-ro'])
  })
})

describe('searchPlaces', () => {
  it('keeps Nominatim results when Open-Meteo fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes('open-meteo')) throw new TypeError('offline')
      return new Response(JSON.stringify([nominatim()]), { status: 200 })
    }))
    await expect(searchPlaces('כרמי צור')).resolves.toEqual([
      expect.objectContaining({ id: 'osm:node:1', nameHe: 'כרמי צור' }),
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not request either source for fewer than two characters', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(searchPlaces('א')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects when both providers fail without being aborted', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    await expect(searchPlaces('ירושלים')).rejects.toThrow('offline')
  })

  it('keeps Open-Meteo results when Nominatim fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes('nominatim')) return new Response('', { status: 503 })
      return new Response(JSON.stringify({
        results: [{ id: 281184, name: 'ירושלים', latitude: 31.77, longitude: 35.22, country: 'ישראל' }],
      }), { status: 200 })
    }))
    await expect(searchPlaces('ירושלים')).resolves.toEqual([
      expect.objectContaining({ id: '281184', nameHe: 'ירושלים' }),
    ])
  })

  it('throws the abort reason when aborted', async () => {
    const controller = new AbortController()
    const reason = new DOMException('cancelled', 'AbortError')
    vi.stubGlobal('fetch', vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      throw init?.signal?.reason ?? reason
    }))
    controller.abort(reason)
    await expect(searchPlaces('ירושלים', controller.signal)).rejects.toBe(reason)
  })
})

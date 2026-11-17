import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../../config/place'
import { fetchOverpass, parseOverpass } from './overpass'

afterEach(() => vi.unstubAllGlobals())

describe('parseOverpass', () => {
  it('classifies heights, towers, worship halls and fields and merges nearby duplicates', () => {
    const elements = [
      { id: 1, lat: 32, lon: 35, tags: { building: 'yes', 'building:levels': '30' } },
      { id: 2, lat: 32, lon: 35.01, tags: { man_made: 'tower', 'tower:type': 'cooling' } },
      { id: 3, lat: 32, lon: 35.02, tags: { man_made: 'chimney' } },
      { id: 4, lat: 32, lon: 35.022, tags: { man_made: 'chimney', height: '90' } },
      { id: 5, lat: 32, lon: 35.03, tags: { landuse: 'orchard', trees: 'date_palms' } },
      { id: 6, lat: 32, lon: 35.04, tags: { landuse: 'orchard' } },
      { id: 7, lat: 32, lon: 35.05, tags: { amenity: 'place_of_worship', religion: 'jewish', building: 'yes' } },
      { id: 8, lat: 32, lon: 35.06, tags: { amenity: 'place_of_worship', religion: 'muslim', building: 'yes' } },
      { id: 9, lat: 32, lon: 35.07, tags: { landuse: 'vineyard' } },
    ]
    const marks = parseOverpass({ elements })
    expect(marks.find((mark) => mark.kind === 'highrise')?.heightM).toBe(96)
    expect(marks.find((mark) => mark.kind === 'cooling')).toBeTruthy()
    expect(marks.filter((mark) => mark.kind === 'chimney')).toHaveLength(1)
    expect(marks.find((mark) => mark.kind === 'chimney')?.heightM).toBe(90)
    expect(marks.some((mark) => mark.kind === 'palms')).toBe(true)
    expect(marks.some((mark) => mark.kind === 'orchard')).toBe(true)
    expect(marks.find((mark) => mark.id === 'osm-7')?.kind).toBe('synagogue')
    expect(marks.find((mark) => mark.id === 'osm-9')?.kind).toBe('vineyard')
    expect(marks.find((mark) => mark.id === 'osm-8')?.kind).toBe('minaret')
  })
})

describe('fetchOverpass', () => {
  const place: Place = { id: 'x', nameHe: 'מקום', regionHe: '', lat: 32, lon: 35, timezone: 'Asia/Jerusalem' }

  it('tries all mirrors in order and accepts an empty successful answer', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      urls.push(String(input))
      if (urls.length < 3) throw new TypeError('network failed')
      return new Response(JSON.stringify({ elements: [] }), { status: 200 })
    }))
    await expect(fetchOverpass(place, new AbortController().signal)).resolves.toEqual([])
    expect(urls.map((url) => new URL(url).host)).toEqual([
      'overpass-api.de', 'overpass.private.coffee', 'overpass.kumi.systems',
    ])
  })
})

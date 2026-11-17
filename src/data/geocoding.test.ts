import { describe, expect, it } from 'vitest'
import { mapGeocodingResult } from './geocoding'

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
      regionHe: 'מחוז ירושלים',
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

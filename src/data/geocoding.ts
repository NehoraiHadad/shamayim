import type { Place } from '../config/place'

export interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation?: number
  timezone?: string
  admin1?: string
  admin2?: string
  country?: string
}

interface GeocodingResponse {
  results?: GeocodingResult[]
}

interface ReverseResponse {
  display_name?: string
  address?: Record<string, string | undefined>
}

export function mapGeocodingResult(result: GeocodingResult): Place {
  return {
    id: String(result.id),
    nameHe: result.name,
    regionHe: result.admin1 ?? result.admin2 ?? result.country ?? '',
    lat: result.latitude,
    lon: result.longitude,
    timezone: result.timezone ?? deviceTimezone(),
    elevation: result.elevation,
  }
}

async function request(url: URL, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('לא הצלחנו לחפש מקום כרגע')
  const body = await response.json() as GeocodingResponse
  return Array.isArray(body.results) ? body.results : []
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({ name: query, language: 'he', count: '6' }).toString()
  return (await request(url, signal)).map(mapGeocodingResult)
}

export async function reversePlace(lat: number, lon: number, signal?: AbortSignal): Promise<Place> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.search = new URLSearchParams({
      lat: String(lat), lon: String(lon), format: 'jsonv2', zoom: '13',
      addressdetails: '1', 'accept-language': 'he',
    }).toString()
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error('Reverse geocoding failed')
    const body = await response.json() as ReverseResponse
    const address = body.address ?? {}
    const name = address.city ?? address.town ?? address.village ?? address.municipality
      ?? body.display_name?.split(',')[0]
    if (name) return {
      id: gpsId(lat, lon), nameHe: name,
      regionHe: address.state ?? address.county ?? address.country ?? '',
      lat, lon, timezone: deviceTimezone(), usesOsm: true,
    }
  } catch (error) {
    if (signal?.aborted) throw error
  }
  return {
    id: gpsId(lat, lon),
    nameHe: 'המיקום שלי',
    regionHe: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    lat,
    lon,
    timezone: deviceTimezone(),
  }
}

function gpsId(lat: number, lon: number): string {
  return `gps:${lat.toFixed(2)},${lon.toFixed(2)}`
}

function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

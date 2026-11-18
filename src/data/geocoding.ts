import type { Place } from '../config/place'
import { withLocalRegion } from './region/israelRegion'
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
  population?: number
  feature_code?: string
}
interface GeocodingResponse { results?: GeocodingResult[] }
export interface NominatimResult {
  osm_type: string
  osm_id: number
  name?: string
  display_name?: string
  lat: string
  lon: string
  category: string
  type: string
  addresstype?: string
  address?: Record<string, string | undefined>
  extratags?: Record<string, string | undefined>
}
interface ReverseResponse { display_name?: string; address?: Record<string, string | undefined> }

/** OSM maps some villages (e.g. מעלה חבר) only as a residential area, with the settlement kind in addresstype. */
const SETTLEMENT_TYPES = new Set(['town', 'village', 'hamlet', 'isolated_dwelling'])
const PLACE_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'isolated_dwelling', 'locality'])
const FEATURE_CODES: Record<string, string> = {
  city: 'PPLA', town: 'PPL', village: 'PPL', hamlet: 'PPL', isolated_dwelling: 'PPL',
  suburb: 'PPLX', neighbourhood: 'PPLX', locality: 'PPLL',
}
export function mapGeocodingResult(result: GeocodingResult): Place {
  return withLocalRegion({
    id: String(result.id),
    nameHe: result.name,
    regionHe: result.admin1 ?? result.admin2 ?? result.country ?? '',
    lat: result.latitude,
    lon: result.longitude,
    timezone: result.timezone ?? deviceTimezone(),
    elevation: result.elevation,
    ...(result.population == null ? {} : { population: result.population }),
    ...(result.feature_code == null ? {} : { featureCode: result.feature_code }),
  })
}

export function mapNominatimResult(result: NominatimResult): Place | null {
  const placeType = PLACE_TYPES.has(result.addresstype ?? '') ? result.addresstype! : result.type
  const isPlace = result.category === 'place' && PLACE_TYPES.has(result.type)
  const isBoundary = result.category === 'boundary' && result.type === 'administrative' && PLACE_TYPES.has(placeType)
  const isResidential = result.category === 'landuse' && result.type === 'residential'
    && SETTLEMENT_TYPES.has(result.addresstype ?? '')
  if (!isPlace && !isBoundary && !isResidential) return null
  const lat = Number(result.lat)
  const lon = Number(result.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const name = result.name ?? result.display_name?.split(',')[0]
  if (!name) return null
  const population = Number(result.extratags?.population)
  return withLocalRegion({
    id: `osm:${result.osm_type}:${result.osm_id}`,
    nameHe: name,
    regionHe: result.address?.state ?? result.address?.county ?? '',
    lat, lon, timezone: deviceTimezone(), usesOsm: true,
    featureCode: FEATURE_CODES[placeType] ?? FEATURE_CODES[result.type],
    settlementType: placeType,
    ...(Number.isFinite(population) && result.extratags?.population?.trim() ? { population } : {}),
  })
}

export function mergePlaceResults(openMeteo: Place[], nominatim: Place[]): Place[] {
  const unique = nominatim.filter((candidate) => !openMeteo.some((place) =>
    place.nameHe.trim().toLocaleLowerCase() === candidate.nameHe.trim().toLocaleLowerCase()
    || distanceKm(place, candidate) <= 2))
  return [...openMeteo, ...unique].slice(0, 6)
}

async function requestOpenMeteo(url: URL, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('לא הצלחנו לחפש מקום כרגע')
  const body = await response.json() as GeocodingResponse
  return Array.isArray(body.results) ? body.results : []
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  if (query.trim().length < 2) return []
  const openUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
  openUrl.search = new URLSearchParams({ name: query, language: 'he', count: '6' }).toString()
  const osmUrl = new URL('https://nominatim.openstreetmap.org/search')
  osmUrl.search = new URLSearchParams({ q: query, format: 'jsonv2', 'accept-language': 'he', addressdetails: '1', extratags: '1', limit: '6' }).toString()
  const [open, osm] = await Promise.all([
    requestOpenMeteo(openUrl, signal).then((items) => items.map(mapGeocodingResult)).catch(() => []),
    fetch(osmUrl, { signal }).then(async (response) => {
      if (!response.ok) throw new Error('Nominatim search failed')
      return (await response.json() as NominatimResult[]).map(mapNominatimResult).filter((place): place is Place => place !== null)
    }).catch(() => []),
  ])
  if (signal?.aborted) throw signal.reason
  return mergePlaceResults(open, osm)
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
    const placeType = ['city', 'town', 'village'].find((type) => address[type])
    const name = address.city ?? address.town ?? address.village ?? address.municipality
      ?? body.display_name?.split(',')[0]
    if (name) return withLocalRegion({
      id: gpsId(lat, lon), nameHe: name,
      regionHe: address.state ?? address.county ?? address.country ?? '',
      lat, lon, timezone: deviceTimezone(), usesOsm: true,
      ...(placeType ? { featureCode: FEATURE_CODES[placeType] } : {}),
      ...(placeType ? { settlementType: placeType } : {}),
    })
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

function distanceKm(a: Pick<Place, 'lat' | 'lon'>, b: Pick<Place, 'lat' | 'lon'>): number {
  const lat = (a.lat + b.lat) * Math.PI / 360
  const dx = (a.lon - b.lon) * 111.32 * Math.cos(lat)
  const dy = (a.lat - b.lat) * 111.32
  return Math.hypot(dx, dy)
}

function gpsId(lat: number, lon: number): string {
  return `gps:${lat.toFixed(2)},${lon.toFixed(2)}`
}

function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

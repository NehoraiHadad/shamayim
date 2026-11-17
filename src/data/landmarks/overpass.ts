import type { Place } from '../../config/place'
import { LANDMARK_FILTERS } from './filters'
import { offsetKm } from './project'
import type { Landmark, MarkKind } from './types'

interface Element { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }
interface Response { elements?: Element[] }

const HOSTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter']

function box(place: Place, eastKm: number, northKm: number) {
  const lat = northKm / 111.32
  const lon = eastKm / (111.32 * Math.cos(place.lat * Math.PI / 180))
  return `${place.lat - lat},${place.lon - lon},${place.lat + lat},${place.lon + lon}`
}

export function buildQuery(place: Place): string {
  const near = box(place, 12, 1.5)
  const far = box(place, 30, 3)
  const nearLines = LANDMARK_FILTERS.map(({ overpass }) => `${overpass}(${near});`).join('')
  const tall = LANDMARK_FILTERS.filter(({ far: tall }) => tall)
    .map(({ overpass }) => `${overpass}(${far});`).join('')
  return `[out:json][timeout:25];(${nearLines}${tall});out tags center 200;`
}

function classify(tags: Record<string, string>): { kind: MarkKind; height: number } | null {
  const levels = Number.parseFloat(tags['building:levels'] ?? '')
  const taggedHeight = Number.parseFloat(tags.height ?? '')
  const height = Number.isFinite(taggedHeight) ? taggedHeight : undefined
  if (tags.man_made === 'cooling_tower' || tags['tower:type'] === 'cooling') return { kind: 'cooling', height: height ?? 60 }
  if (tags.power === 'generator' && tags['generator:source'] === 'wind') return { kind: 'turbine', height: height ?? 80 }
  if (tags.man_made === 'chimney') return { kind: 'chimney', height: height ?? 60 }
  if (tags.man_made === 'lighthouse') return { kind: 'lighthouse', height: height ?? 20 }
  if (tags['tower:type'] === 'minaret' || tags.building === 'mosque'
    || (tags.amenity === 'place_of_worship' && tags.religion === 'muslim')) return { kind: 'minaret', height: height ?? 30 }
  if (tags.man_made === 'water_tower') return { kind: 'waterTower', height: height ?? 25 }
  if (tags.building && (height ?? levels * 3.2) >= 40) return { kind: 'highrise', height: height ?? levels * 3.2 }
  if (/church|cathedral/.test(tags.building ?? '') && tags.amenity === 'place_of_worship') return { kind: 'church', height: height ?? 25 }
  if (tags.man_made === 'silo') return { kind: 'silo', height: height ?? 30 }
  if (/castle|fort/.test(tags.historic ?? '')) return { kind: 'castle', height: height ?? 12 }
  if (tags.man_made === 'mast' || tags['tower:type'] === 'communication') return { kind: 'mast', height: height ?? 45 }
  if (tags.landuse === 'orchard') return { kind: tags.trees === 'date_palms' ? 'palms' : 'orchard', height: height ?? (tags.trees === 'date_palms' ? 15 : 5) }
  if (tags.power === 'plant' && tags['plant:source'] === 'solar') return { kind: 'solar', height: height ?? 3 }
  if (tags.bridge && /cable-stayed|suspension/.test(tags['bridge:structure'] ?? '')) return { kind: 'bridge', height: height ?? 60 }
  return null
}

export function parseOverpass(json: unknown): Landmark[] {
  const elements = (json as Response)?.elements
  if (!Array.isArray(elements)) return []
  const found: Landmark[] = []
  for (const element of elements) {
    const tags = element.tags ?? {}
    const value = classify(tags)
    const lat = element.lat ?? element.center?.lat
    const lon = element.lon ?? element.center?.lon
    if (!value || lat == null || lon == null) continue
    const candidate: Landmark = { id: `osm-${element.id}`, kind: value.kind, nameHe: tags['name:he'] ?? tags.name,
      lat, lon, heightM: value.height, source: 'osm' }
    const duplicate = found.find((mark) => mark.kind === candidate.kind
      && Math.hypot(offsetKm(mark, candidate).dx, offsetKm(mark, candidate).dy) < .3)
    if (!duplicate) found.push(candidate)
    else if (candidate.heightM > duplicate.heightM) Object.assign(duplicate, candidate)
  }
  return found
}

export async function fetchOverpass(place: Place, signal: AbortSignal): Promise<Landmark[]> {
  if (signal.aborted) throw signal.reason
  const query = encodeURIComponent(buildQuery(place))
  let lastError: unknown
  for (const host of HOSTS) {
    const attempt = new AbortController()
    const abort = () => attempt.abort(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    const timeout = globalThis.setTimeout(
      () => attempt.abort(new DOMException('Overpass timeout', 'TimeoutError')), 12_000)
    try {
      const response = await fetch(`${host}?data=${query}`, { signal: attempt.signal })
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`)
      return parseOverpass(await response.json())
    } catch (error) {
      if (signal.aborted) throw error
      lastError = error
    } finally {
      globalThis.clearTimeout(timeout)
      signal.removeEventListener('abort', abort)
    }
  }
  throw lastError
}

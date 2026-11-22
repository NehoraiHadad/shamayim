import type { Place } from '../../config/place'
import { mappedCropArea } from './cropAreas'
import { fameOf, outranks } from './fame'
import { LANDMARK_FILTERS } from './filters'
import { offsetKm } from './project'
import type { Landmark, MarkKind } from './types'
import { BELL_TOWER_M, levelHeight, taggedHeight, worshipHeight } from './worship'

interface Point { lat: number; lon: number }
interface Element {
  id: number; lat?: number; lon?: number; center?: Point; tags?: Record<string, string>
  type?: string; geometry?: Point[]; areaGeometry?: unknown
}
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
  // Keep the bounded landmark response, and fetch closed crop ways separately with actual geometry.
  const crops = `way[landuse~"^(orchard|vineyard)$"](${near});`
  return `[out:json][timeout:25];(${nearLines}${tall});out tags center 200;(${crops});out geom 200;`
}

function areaOf(element: Element, tags: Record<string, string>) {
  return mappedCropArea(tags, element.areaGeometry ?? (element.type === 'way' && Array.isArray(element.geometry)
    ? { type: 'Polygon', coordinates: [element.geometry.map(({ lon, lat }) => [lon, lat])] }
    : undefined))
}

function classify(tags: Record<string, string>): { kind: MarkKind; height: number } | null {
  const height = taggedHeight(tags)
  if (tags.man_made === 'cooling_tower' || tags['tower:type'] === 'cooling') return { kind: 'cooling', height: height ?? 60 }
  if (tags.power === 'generator' && tags['generator:source'] === 'wind') return { kind: 'turbine', height: height ?? 80 }
  if (tags.man_made === 'chimney') return { kind: 'chimney', height: height ?? 60 }
  if (tags.man_made === 'lighthouse') return { kind: 'lighthouse', height: height ?? 20 }
  const minaret = tags['tower:type'] === 'minaret' || tags.building === 'minaret'
  const tower = tags.man_made === 'tower'
  if (minaret || tags.building === 'mosque' || (tags.amenity === 'place_of_worship' && tags.religion === 'muslim')) {
    return { kind: 'minaret', height: worshipHeight(tags, minaret || tower) }
  }
  if (tags.amenity === 'place_of_worship' && tags.religion === 'jewish' && tags.building) {
    return { kind: 'synagogue', height: worshipHeight(tags, tower) }
  }
  if (tags.man_made === 'water_tower') return { kind: 'waterTower', height: height ?? 25 }
  const buildingHeight = height ?? levelHeight(tags)
  if (tags.building && buildingHeight !== undefined && buildingHeight >= 40) return { kind: 'highrise', height: buildingHeight }
  if (/church|cathedral/.test(tags.building ?? '') && tags.amenity === 'place_of_worship') {
    return { kind: 'church', height: worshipHeight(tags, tower, BELL_TOWER_M) }
  }
  if (tags.man_made === 'silo') return { kind: 'silo', height: height ?? 30 }
  if (/castle|fort/.test(tags.historic ?? '')) return { kind: 'castle', height: height ?? 12 }
  if (tags.man_made === 'mast' || tags['tower:type'] === 'communication') return { kind: 'mast', height: height ?? 45 }
  if (tags.landuse === 'orchard') return { kind: tags.trees === 'date_palms' ? 'palms' : 'orchard', height: height ?? (tags.trees === 'date_palms' ? 15 : 5) }
  if (tags.landuse === 'vineyard') return { kind: 'vineyard', height: height ?? 2 }
  if (tags.power === 'plant' && tags['plant:source'] === 'solar') return { kind: 'solar', height: height ?? 3 }
  if (tags.bridge && /cable-stayed|suspension/.test(tags['bridge:structure'] ?? '')) return { kind: 'bridge', height: height ?? 60 }
  return null
}

/**
 * `name`: a rule the mark's name and fame pass through with the object's tags (the landmarks build applies the
 * industrial-landmark rule, `industrial.ts`); the app's own Overpass reads keep the tags' name as it is.
 */
export function parseOverpass(json: unknown, options: { name?: (mark: Landmark, tags: Record<string, string>) => Landmark } = {}): Landmark[] {
  const elements = (json as Response)?.elements
  if (!Array.isArray(elements)) return []
  const found: Landmark[] = []
  const wayCentres = new Map(elements.filter((e) => e.type === 'way' && e.center).map((e) => [e.id, e.center!]))
  const withGeometry = new Set(elements.filter((e) => e.type === 'way' && e.geometry?.length).map((e) => e.id))
  for (const element of elements) {
    const tags = element.tags ?? {}
    const value = classify(tags)
    const cropArea = areaOf(element, tags)
    if (element.type === 'way' && !element.geometry && withGeometry.has(element.id)) continue
    const center = element.center ?? (element.type === 'way' ? wayCentres.get(element.id) ?? element.geometry?.[0] : undefined)
    const lat = element.lat ?? center?.lat
    const lon = element.lon ?? center?.lon
    if (!value || lat == null || lon == null) continue
    const fame = fameOf(tags)
    const read: Landmark = { id: `osm-${element.id}`, kind: value.kind, nameHe: tags['name:he'] ?? tags.name,
      lat, lon, heightM: value.height, source: 'osm', ...(fame ? { fame } : {}), ...(cropArea ? { cropArea } : {}) }
    const candidate = options.name ? options.name(read, tags) : read
    const duplicate = !cropArea && found.find((mark) => !mark.cropArea && mark.kind === candidate.kind
      && Math.hypot(offsetKm(mark, candidate).dx, offsetKm(mark, candidate).dy) < .3)
    if (!duplicate) found.push(candidate)
    // Of two of a kind side by side the famous one stays (a tower with its own article over its taller neighbour).
    else if (outranks(candidate, duplicate)) Object.assign(duplicate, candidate)
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

import { offsetKm } from '../../src/data/landmarks/project'
import type { Coordinate } from '../../src/data/landmarks/project'
import type { Tags } from './geometry'

const homes = new Set(['house', 'detached', 'semidetached_house', 'bungalow'])
const employment = new Set(['industrial', 'warehouse', 'retail', 'commercial'])

function positive(tag: string | undefined) {
  if (!tag || !/^\s*\d+(?:\.\d+)?\s*$/.test(tag)) return undefined
  const n = Number(tag)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function validHeight(height: number, tags: Tags) {
  return height <= 260 || Boolean(tags['name:he']?.trim() || tags.name?.trim())
}

export function taggedLevels(tags: Tags) {
  const levels = positive(tags['building:levels'])
  if (levels && validHeight(levels * 3.2, tags)) return levels
}

export function taggedHeight(tags: Tags) {
  const metres = positive(tags.height?.replace(/\s*m\s*$/i, ''))
  if (metres && validHeight(metres, tags)) return metres
  const levels = taggedLevels(tags)
  if (levels) return levels * 3.2
}

/** Explicit building types only: a bare `yes`/`residential` says nothing about storeys (most of OSM Israel). */
export function typeHeight(type: string | undefined) {
  if (type && homes.has(type)) return 6.4
  if (type === 'apartments') return 12.8
  if (type && employment.has(type)) return 8
}

/**
 * Storeys from footprint area for an untyped building (m² → levels): a house stands on < 150 m², a 1950s–70s
 * walk-up block on 150–450, a newer 6–9 storey block on 450–1 200, and a slab or tower podium on more.
 * Inside residential land only; elsewhere a bare footprint is a shed, a hall or a house.
 */
export function footprintLevels(area: number, residential: boolean) {
  if (!residential) return area < 150 ? 2 : 3
  return area < 150 ? 2 : area < 450 ? 4 : area < 1200 ? 6 : 8
}

export class NearbyHeights {
  private bins = new Map<string, (Coordinate & { height: number })[]>()

  add(point: Coordinate, height: number) {
    const key = this.key(point.lat, point.lon)
    const bin = this.bins.get(key) ?? []
    bin.push({ ...point, height })
    this.bins.set(key, bin)
  }

  median(point: Coordinate) {
    const hits: number[] = []
    const latReach = 0.5 / 111.32
    const lonReach = latReach / Math.cos((Math.abs(point.lat) + latReach) * Math.PI / 180)
    for (let y = Math.floor((point.lat - latReach) * 100); y <= Math.floor((point.lat + latReach) * 100); y++) {
      for (let x = Math.floor((point.lon - lonReach) * 100); x <= Math.floor((point.lon + lonReach) * 100); x++) {
        for (const tag of this.bins.get(`${y}_${x}`) ?? []) {
          const { dx, dy } = offsetKm(point, tag)
          if (dx * dx + dy * dy <= 0.25) hits.push(tag.height)
        }
      }
    }
    if (hits.length < 5) return undefined
    hits.sort((a, b) => a - b)
    return (hits[Math.floor((hits.length - 1) / 2)] + hits[Math.floor(hits.length / 2)]) / 2
  }

  private key(lat: number, lon: number) {
    return `${Math.floor(lat * 100)}_${Math.floor(lon * 100)}`
  }
}

export function resolveHeight(tags: Tags, residential: boolean, point: Coordinate & { area?: number },
  nearby: NearbyHeights) {
  const tagged = taggedHeight(tags)
  if (tagged !== undefined) return { height: tagged, source: 'tag' } as const
  const typed = typeHeight(tags.building)
  if (typed !== undefined) return { height: typed, source: 'type' } as const
  /** Tagged neighbours are measured evidence of this street's height; the footprint is only a proxy. */
  const local = nearby.median(point)
  if (local !== undefined) return { height: local, source: 'inferred' } as const
  if (point.area) return { height: footprintLevels(point.area, residential) * 3.2, source: 'footprint' } as const
  return { height: 9.6, source: 'inferred' } as const
}

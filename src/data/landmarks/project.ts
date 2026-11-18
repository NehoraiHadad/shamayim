import { azimuthFraction } from '../terrain/panorama'
import { FAR_RADIUS_KM, NEAR_RADIUS_KM, RIDGE_WIDTH, ridgeX } from '../terrain/ridgeProjection'
import type { MarkKind, TerrainSample } from './types'

export interface Coordinate { lat: number; lon: number }

export function offsetKm(place: Coordinate, mark: Coordinate) {
  const dx = (mark.lon - place.lon) * 111.32 * Math.cos(mark.lat * Math.PI / 180)
  const dy = (mark.lat - place.lat) * 111.32
  return { dx, dy }
}

/**
 * Where a mark stands in the horizon panorama: x by its true bearing from the place (the sky's and the land's own
 * mapping: west-north-west at the left edge, south in the middle, east-north-east at the right), and how far it is.
 * Null when it lies behind the viewer (the northern quarter the scene does not show).
 */
export function bearingOf(place: Coordinate, mark: Coordinate): { x: number; km: number } | null {
  const { dx, dy } = offsetKm(place, mark)
  const km = Math.hypot(dx, dy)
  // Right at the place the bearing means nothing: the middle of the scene.
  if (km < 0.15) return { x: RIDGE_WIDTH / 2, km }
  const azimuth = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
  const fraction = azimuthFraction(azimuth)
  return fraction > 1 ? null : { x: RIDGE_WIDTH * fraction, km }
}

/** What the land is like in one direction of the panorama (see `SceneTerrain.sightAt`). */
export interface Sight { nearKm: number; farKm: number; farShows: boolean }

/**
 * Which ridge a mark at `km` stands on in a direction: the near ridge when it is no further than just behind it (or
 * within 2 km, a town's own buildings), the far horizon when that shows above the near ridge and the mark is within a
 * few km of its crest, else none (the land in front hides it). `behindKm` is how far it stands behind (+) or before (−) that ridge.
 */
export function sightLayer(km: number, sight: Sight): { layer: 'near' | 'far'; behindKm: number } | null {
  if (km <= Math.max(sight.nearKm + 1, 2)) return { layer: 'near', behindKm: km - sight.nearKm }
  if (km <= 30 && sight.farShows && km >= sight.farKm - 4 && km <= sight.farKm + 3) return { layer: 'far', behindKm: km - sight.farKm }
  return null
}

/** Use the ridge that the panorama actually draws in this direction. */
export function projectSight(place: Coordinate, target: Coordinate, sightAt: (x: number) => Sight) {
  const bearing = bearingOf(place, target)
  if (!bearing) return null
  const sight = sightLayer(bearing.km, sightAt(bearing.x))
  return sight && { ...bearing, ...sight }
}

/** The old west–east cross-section projection (stand-in drawings, before a place's panorama is known). */
export function toX(dx: number): { x: number; layer: 'near' | 'far' } | null {
  const distance = Math.abs(dx)
  if (distance > FAR_RADIUS_KM) return null
  return distance <= NEAR_RADIUS_KM
    ? { x: ridgeX(dx, NEAR_RADIUS_KM), layer: 'near' }
    : { x: ridgeX(dx, FAR_RADIUS_KM), layer: 'far' }
}

export function groundY(samples: TerrainSample[], x: number): number {
  if (!samples.length) return 128
  if (x <= samples[0].x) return samples[0].y
  const last = samples.at(-1)!
  if (x >= last.x) return last.y
  const rightIndex = samples.findIndex((sample) => sample.x >= x)
  const left = samples[rightIndex - 1]
  const right = samples[rightIndex]
  const t = (x - left.x) / (right.x - left.x)
  return left.y + (right.y - left.y) * t
}

export function groundElevation(samples: TerrainSample[], x: number): number | undefined {
  if (!samples.length || samples.some((sample) => sample.elevation == null)) return undefined
  if (x <= samples[0].x) return samples[0].elevation
  const last = samples.at(-1)!
  if (x >= last.x) return last.elevation
  const i = samples.findIndex((sample) => sample.x >= x)
  const a = samples[i - 1]
  const b = samples[i]
  const t = (x - a.x) / (b.x - a.x)
  return a.elevation! + (b.elevation! - a.elevation!) * t
}

export function markHeight(heightM: number, layer: 'near' | 'far' = 'near'): number {
  const near = Math.round(Math.max(10, Math.min(34, 8 + 26 * Math.sqrt(heightM / 240))))
  return layer === 'far' ? Math.max(8, Math.round(near * 0.6)) : near
}

export function markWidth(kind: MarkKind, glyph: string | undefined, height: number): number {
  const broadKind = ['bridge', 'homes', 'palms', 'orchard', 'solar', 'cooling', 'silo', 'castle'].includes(kind)
  const broadGlyph = /azrieli|cooling|bridge|wall|dagon|bab/.test(glyph ?? '')
  return broadKind || broadGlyph ? Math.max(12, height * .95) : Math.max(7, height * .65)
}

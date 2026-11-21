import type { Landmark } from './types'

export type CropKind = 'orchard' | 'olive' | 'citrus' | 'palm' | 'vineyard'
/** GeoJSON order (longitude, latitude). First ring is the shell, remaining rings are holes. */
export type CropRing = readonly (readonly [number, number])[]
export interface CropArea {
  source: 'osm'
  kind: CropKind
  polygons: readonly (readonly CropRing[])[]
}

/** Half-degree sectors. Callers with 0.1° landmark cell indices pass degrees. */
export const cropSectorOf = (lat: number, lon: number) => `${Math.floor(lat * 2)}_${Math.floor(lon * 2)}`

/** OSM area semantics and species tags: https://wiki.openstreetmap.org/wiki/Key:trees */
export function mappedCropArea(tags: Record<string, string>, geometry?: unknown): CropArea | undefined {
  const geo = geometry as { type?: string; coordinates?: unknown } | undefined
  const kind = tags.landuse === 'vineyard' ? 'vineyard' : tags.landuse === 'orchard' ? orchardKind(tags.trees) : null
  const polygons = geo?.type === 'Polygon' ? [geo.coordinates] : geo?.type === 'MultiPolygon' ? geo.coordinates : null
  if (!kind || !Array.isArray(polygons) || !polygons.length || !polygons.every(validPolygon)) return
  return { source: 'osm', kind, polygons }
}

function orchardKind(trees?: string): CropKind {
  if (trees === 'date_palms') return 'palm'
  if (trees === 'olive_trees') return 'olive'
  if (trees === 'citrus_trees' || trees === 'lemon_trees' || trees === 'orange_trees') return 'citrus'
  return 'orchard'
}

function validPolygon(polygon: unknown): polygon is CropRing[] {
  return Array.isArray(polygon) && polygon.length > 0 && polygon.every((ring) =>
    Array.isArray(ring) && ring.length >= 4 && ring.every((p) =>
      Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1])
}

const cache = new WeakMap<readonly Landmark[], readonly CropArea[]>()

/** Independent evidence is taken before ranking or moving portrait marks. Legacy points have no footprint. */
export function mappedCropAreas(marks: readonly Landmark[]): readonly CropArea[] {
  let areas = cache.get(marks)
  if (!areas) cache.set(marks, areas = marks.flatMap((m) => m.source === 'osm' && m.cropArea ? [m.cropArea] : []))
  return areas
}

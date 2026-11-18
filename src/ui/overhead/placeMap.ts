import type { Map as MapLibre, LngLatBoundsLike } from 'maplibre-gl'
import type { Place } from '../../config/place'
import { circle, EARTH_KM } from './geo'

export const MAP_BOUNDS: LngLatBoundsLike = [[32, 29], [37.5, 34.5]]
const radians = Math.PI / 180

export function openingZoom(width: number, latitude: number) {
  return Math.log2(Math.max(width, 1) * 2 * Math.PI * EARTH_KM * Math.cos(latitude * radians) / (512 * 350))
}

export function addRings(map: MapLibre, place: Place, color: string) {
  const centre: [number, number] = [place.lon, place.lat]
  map.addSource('overhead-distance', {
    type: 'geojson',
    data: { type: 'MultiLineString', coordinates: [circle(centre, 25), circle(centre, 50)] },
  })
  map.addLayer({
    id: 'overhead-distance', type: 'line', source: 'overhead-distance',
    paint: { 'line-color': color, 'line-dasharray': [3, 4], 'line-width': 1, 'line-opacity': 0.75 },
  })
}

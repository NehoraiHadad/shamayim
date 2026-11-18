import type { Map as MapLibre, LngLatBoundsLike } from 'maplibre-gl'
import type { Place } from '../../config/place'

export const MAP_BOUNDS: LngLatBoundsLike = [[32, 29], [37.5, 34.5]]
const radians = Math.PI / 180
const earthKm = 6371

export function openingZoom(width: number, latitude: number) {
  return Math.log2(Math.max(width, 1) * 2 * Math.PI * earthKm * Math.cos(latitude * radians) / (512 * 350))
}

function ring({ lon, lat }: Place, km: number): [number, number][] {
  const latitude = lat * radians
  const distance = km / earthKm
  return Array.from({ length: 73 }, (_, i) => {
    const bearing = i / 72 * 2 * Math.PI
    const y = Math.asin(Math.sin(latitude) * Math.cos(distance)
      + Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing))
    const dx = Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude),
      Math.cos(distance) - Math.sin(latitude) * Math.sin(y))
    return [lon + dx / radians, y / radians]
  })
}

export function addRings(map: MapLibre, place: Place, color: string) {
  map.addSource('overhead-distance', {
    type: 'geojson',
    data: { type: 'MultiLineString', coordinates: [ring(place, 25), ring(place, 50)] },
  })
  map.addLayer({
    id: 'overhead-distance', type: 'line', source: 'overhead-distance',
    paint: { 'line-color': color, 'line-dasharray': [3, 4], 'line-width': 1, 'line-opacity': 0.75 },
  })
}

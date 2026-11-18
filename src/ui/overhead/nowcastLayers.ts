import type { GeoJSONSource, Map as MapLibre } from 'maplibre-gl'
import type { Place } from '../../config/place'
import type { RainOutlook } from '../../domain/rainNowcast'
import { motionArrow } from './motionArrow'

export const ARROW = 'overhead-arrow'
export const ARROW_HALO = 'overhead-arrow-halo'

/** The motion arrow: a halo in the land colour under a stroke in the label ink (repainted with the paper). */
export function addArrowLayers(map: MapLibre, ink: { text: string; land: string }) {
  map.addSource(ARROW, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  const layout = { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' } as const
  map.addLayer({ id: ARROW_HALO, type: 'line', source: ARROW, layout, paint: { 'line-color': ink.land, 'line-width': 6.5 } })
  map.addLayer({ id: ARROW, type: 'line', source: ARROW, layout, paint: { 'line-color': ink.text, 'line-width': 2.5 } })
}

/**
 * Draws the arrow for the outlook, only on the newest frame: on an older frame it would point from where the rain
 * no longer is.
 */
export function showArrow(map: MapLibre, place: Place, outlook: RainOutlook | null, newest: boolean) {
  const source = map.getSource<GeoJSONSource>(ARROW)
  if (!source) return
  // Web Mercator at 512 px tiles: metres per pixel at this latitude and zoom.
  const kmPerPx = (78_271.517 * Math.cos((place.lat * Math.PI) / 180)) / 2 ** map.getZoom() / 1000
  const lines = newest ? motionArrow(outlook, [place.lon, place.lat], kmPerPx) : null
  source.setData({ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines ?? [] } })
  for (const id of [ARROW_HALO, ARROW]) {
    const visibility = lines ? 'visible' : 'none'
    if (map.getLayoutProperty(id, 'visibility') !== visibility) map.setLayoutProperty(id, 'visibility', visibility)
  }
}

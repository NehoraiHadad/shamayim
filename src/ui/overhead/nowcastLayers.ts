import type { GeoJSONSource, Map as MapLibre } from 'maplibre-gl'
import type { Place } from '../../config/place'
import type { RainOutlook } from '../../domain/rainNowcast'
import { edgePointer } from './edgePointer'
import { destination } from './geo'
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

export type Pointer = { x: number; y: number; angle: number; km: number }
/** The nowcast grid reads ~265 km around the place; beyond that nothing is known, so nothing is pointed at. */
const POINTER_KM = 265

/**
 * Where to put the "גשם · כ־230 ק״מ" chip: on the map's edge, on the line from the place toward the nearest rain,
 * only when the newest frame shows no rain in view (the person cannot pan or zoom out to it).
 */
export function pointerFor(map: MapLibre, place: Place, outlook: RainOutlook | null, newest: boolean, clearView: boolean): Pointer | null {
  const near = outlook?.nearest
  if (!newest || !clearView || !near || near.km > POINTER_KM) return null
  const origin = map.project([place.lon, place.lat])
  const target = map.project(destination([place.lon, place.lat], near.km, near.bearing))
  const { clientWidth, clientHeight } = map.getContainer()
  const edge = edgePointer(origin, target, clientWidth, clientHeight, { x: 64, y: 22 })
  if (!edge) return null
  // The ring labels sit on the place's row east of it, its name just above: slide the chip below that row.
  const y = edge.x > origin.x && Math.abs(edge.y - origin.y) < 28 ? origin.y + 28 : edge.y
  return { ...edge, y, km: near.km }
}

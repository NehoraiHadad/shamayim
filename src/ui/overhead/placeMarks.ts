import type { Map as MapLibre } from 'maplibre-gl'
import type { Place } from '../../config/place'
import { destination, type LonLat } from './geo'
import styles from './MapMarks.module.css'

type MapLibreModule = typeof import('maplibre-gl')

/** Ring distances in km; the inner ring is labelled only once zoomed in (at the opening zoom it is ~25 px across). */
export const RINGS = [25, 50] as const

function element(className: string, text?: string) {
  const node = document.createElement('span')
  node.className = className
  node.dir = 'rtl'
  if (text) node.textContent = text
  node.setAttribute('aria-hidden', 'true')
  return node
}

/**
 * The place as an ink disc with its name above (not "you are here": the name is what people recognise), and the
 * rings' distances at their eastern point: rain comes from the west and north-west, the name sits to the north, and
 * the south point collided with Jerusalem's label.
 */
export function addPlaceMarks(maplibre: MapLibreModule, map: MapLibre, place: Place, openingZoom: number) {
  const centre: LonLat = [place.lon, place.lat]
  const marker = element(styles.place)
  marker.append(element(`${styles.halo} ${styles.name}`, place.nameHe), element(styles.disc))
  new maplibre.Marker({ element: marker }).setLngLat(centre).addTo(map)

  const labels = RINGS.map((km) => {
    const label = element(`${styles.halo} ${styles.ring}`, `${km} ק״מ`)
    new maplibre.Marker({ element: label, anchor: 'left' }).setLngLat(destination(centre, km, 90)).setOffset([3, 0]).addTo(map)
    return { km, label }
  })
  const zoomed = () => {
    for (const { km, label } of labels) label.hidden = km === RINGS[0] && map.getZoom() < openingZoom + 0.5
  }
  zoomed()
  map.on('zoom', zoomed)
}

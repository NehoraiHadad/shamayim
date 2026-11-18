import type { Place } from '../../config/place'
import { REGION_ANCHORS } from './anchors'

/** Coarse outline of the Land of Israel west of the Jordan, with the Golan ([lon, lat]). Gaza and Sinai stay outside. */
const LAND: readonly (readonly [number, number])[] = [
  [35.09, 33.10], [35.58, 33.29], [35.82, 33.34], [35.91, 33.20], [35.86, 32.95], [35.80, 32.74], [35.66, 32.66],
  [35.57, 32.64], [35.56, 32.30], [35.53, 31.90], [35.55, 31.75], [35.53, 31.45], [35.47, 31.10], [35.40, 30.90],
  [35.17, 30.30], [35.00, 29.54], [34.90, 29.49], [34.27, 31.22], [34.38, 31.30], [34.48, 31.45], [34.56, 31.56],
  [34.49, 31.595], [34.50, 31.64], [34.60, 31.82], [34.72, 32.05], [34.80, 32.33], [34.88, 32.60], [34.92, 32.84], [35.04, 32.92],
  [35.07, 33.05],
]
/** Beyond this, the nearest anchor says little; keep the source's own region. */
const MAX_ANCHOR_KM = 35
const ISRAEL_TIMEZONE = 'Asia/Jerusalem'
/** Cantillation and vowel points, but not the maqaf (U+05BE) that joins words. */
const NIQQUD = /[֑-ֽֿ-ׂׄ-ׇ]/g
const FOREIGN_NAMES: Record<string, string> = { 'הגדה המערבית': 'יהודה ושומרון', 'الأراضي الفلسطينية': 'יהודה ושומרון' }

function inside(lat: number, lon: number): boolean {
  let hit = false
  for (let i = 0, j = LAND.length - 1; i < LAND.length; j = i++) {
    const [xi, yi] = LAND[i]
    const [xj, yj] = LAND[j]
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

function km(lat: number, lon: number, [aLat, aLon]: readonly [number, number]): number {
  const dx = (lon - aLon) * 111.32 * Math.cos(lat * Math.PI / 180)
  return Math.hypot(dx, (lat - aLat) * 110.57)
}

/** The local region name (גולן, שומרון, הר חברון…) or null outside the land. */
export function israelRegionHe(lat: number, lon: number): string | null {
  if (!inside(lat, lon)) return null
  let best: string | null = null
  let bestKm = MAX_ANCHOR_KM
  for (const [region, anchors] of Object.entries(REGION_ANCHORS)) {
    for (const anchor of anchors) {
      const d = km(lat, lon, anchor)
      if (d < bestKm) { bestKm = d; best = region }
    }
  }
  return best
}

/** Cleans a source region: no niqqud, no foreign naming of the land. */
export function cleanRegionHe(region: string): string {
  const plain = region.replace(NIQQUD, '').trim()
  return FOREIGN_NAMES[plain] ?? plain
}

/**
 * Gives a place its local region name (a region equal to the place's own name is dropped) and, inside the land,
 * Israel's clock: OSM results carry the device's timezone, which is wrong for a traveller or a misset phone.
 */
export function withLocalRegion(place: Place): Place {
  const region = israelRegionHe(place.lat, place.lon) ?? cleanRegionHe(place.regionHe)
  const timezone = inside(place.lat, place.lon) ? ISRAEL_TIMEZONE : place.timezone
  return { ...place, regionHe: region === place.nameHe ? '' : region, timezone }
}

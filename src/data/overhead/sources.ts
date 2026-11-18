/**
 * URLs for the "view from above" page: RainViewer past radar (Web Mercator tiles, zoom ≤ 7 on the free tier) and
 * EUMETSAT Meteosat imagery through EUMETView WMS (CORS-open, refreshed every 15 min, ~20–35 min behind).
 */

export const RAINVIEWER_INDEX = 'https://api.rainviewer.com/public/weather-maps.json'
export const EUMETVIEW_WMS = 'https://view.eumetsat.int/geoserver/ows'
/** MSG cloud mask: cloud is white (255,255,255); clear land green, clear sea blue. */
export const CLOUD_MASK_LAYER = 'msg_fes:clm'
export const RADAR_MAX_ZOOM = 7
const SATELLITE_STEP_MIN = 15
/** Slots newer than this are usually not published yet. */
const SATELLITE_LAG_MIN = 30

export interface RadarFrame {
  /** UTC epoch milliseconds. */
  time: number
  path: string
}

export interface RadarIndex {
  host: string
  frames: RadarFrame[]
}

/** Parses RainViewer's `weather-maps.json` into past frames, oldest first. Unknown shapes give no frames. */
export function parseRadarIndex(json: unknown): RadarIndex {
  const data = json as { host?: unknown; radar?: { past?: { time?: unknown; path?: unknown }[] } }
  const host = typeof data?.host === 'string' ? data.host : ''
  const past = Array.isArray(data?.radar?.past) ? data.radar.past : []
  const frames = past
    .filter((f) => typeof f.time === 'number' && typeof f.path === 'string')
    .map((f) => ({ time: (f.time as number) * 1000, path: f.path as string }))
    .sort((a, b) => a.time - b.time)
  return { host, frames: host ? frames : [] }
}

/** A MapLibre raster tile template for one radar frame: 512 px tiles, Universal Blue (2), smoothed, snow shown. */
export function radarTiles(index: RadarIndex, frame: RadarFrame): string {
  return `${index.host}${frame.path}/512/{z}/{x}/{y}/2/1_1.png`
}

/** The newest satellite slot that is probably published, as a UTC epoch (multiple of 15 min). */
export function latestSatelliteSlot(nowMs: number): number {
  const step = SATELLITE_STEP_MIN * 60_000
  return Math.floor((nowMs - SATELLITE_LAG_MIN * 60_000) / step) * step
}

/** The satellite slot to show with a radar frame: the last one at or before it. */
export function satelliteSlotFor(timeMs: number, nowMs: number): number {
  const step = SATELLITE_STEP_MIN * 60_000
  return Math.min(Math.floor(timeMs / step) * step, latestSatelliteSlot(nowMs))
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 19) + 'Z'

/** WMS GetMap for a layer in Web Mercator; `bbox` is `{bbox-epsg-3857}` for MapLibre or explicit metres. */
export function satelliteMapUrl(layer: string, bbox: string, size: number, timeMs: number | null): string {
  const q = new URLSearchParams({
    service: 'WMS', version: '1.3.0', request: 'GetMap', layers: layer, styles: '', format: 'image/png',
    transparent: 'true', crs: 'EPSG:3857', width: String(size), height: String(size),
  })
  if (timeMs != null) q.set('time', iso(timeMs))
  // `{bbox-epsg-3857}` must stay unescaped for MapLibre to fill it in.
  return `${EUMETVIEW_WMS}?${q}&bbox=${bbox}`
}

const R = 6_378_137
/** Web Mercator metres for a lon/lat. */
export function mercator(lon: number, lat: number): [number, number] {
  return [R * (lon * Math.PI) / 180, R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))]
}

/** A square Web Mercator bbox string of about `km` across the ground around a point. */
export function bboxAround(lon: number, lat: number, km: number): string {
  const [x, y] = mercator(lon, lat)
  // Mercator stretches by 1/cos(lat); widen so the box covers `km` of real ground.
  const half = (km * 500) / Math.cos((lat * Math.PI) / 180)
  return [x - half, y - half, x + half, y + half].map((v) => v.toFixed(0)).join(',')
}

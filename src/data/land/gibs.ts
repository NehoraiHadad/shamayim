import type { Coordinate } from '../landmarks/project'
import { tilesAround, tileXY } from '../terrain/dem'
import { decodeGibsNdviPng, defaultDecodeJpeg } from './gibsDecode'
import type { FarLandGrid } from './types'

/**
 * Far-field land observations (±60 km) from NASA GIBS WMTS (NASA EOSDIS open data, public domain,
 * `Access-Control-Allow-Origin: *`, measured ~350–580 ms per tile).
 *
 * Layers:
 * - `MODIS_Terra_NDVI_8Day` (`GoogleMapsCompatible_Level9`, zoom 8 ≈ 520 m/px, indexed PNG):
 *   rolling 8-day composite updated daily (`P1D`, lag 1–2 d).
 * - `MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day` (`GoogleMapsCompatible_Level8`, zoom 8, JPEG):
 *   8-day cloud-cleared true-colour surface reflectance composite (DOY = 1 + 8k, lag 10–19 d).
 */
export const GIBS_WMTS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'
export const MODIS_NDVI_LAYER = 'MODIS_Terra_NDVI_8Day'
export const MODIS_SR_LAYER = 'MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day'
export const GIBS_ZOOM = 8
export const FAR_REACH_KM = 60
export const FAR_STEP_KM = 2
const TILE = 256

export interface FarFetchDeps {
  fetchImpl?: typeof fetch
  decodeJpeg?: (bytes: Uint8Array) => Promise<Uint8Array | null>
}

export const gibsNdviUrl = (date: string, z: number, row: number, col: number): string =>
  `${GIBS_WMTS}/${MODIS_NDVI_LAYER}/default/${date}/GoogleMapsCompatible_Level9/${z}/${row}/${col}.png`

export const gibsSrUrl = (date: string, z: number, row: number, col: number): string =>
  `${GIBS_WMTS}/${MODIS_SR_LAYER}/default/${date}/GoogleMapsCompatible_Level8/${z}/${row}/${col}.jpeg`

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Candidate 8-day DOY-aligned dates (`DOY = 1 + 8k`) on or before `now - 8d`, newest first. */
export function srCompositeDates(now: Date, count = 3): string[] {
  const out: string[] = []
  let ms = now.getTime() - 8 * 86_400_000
  for (let i = 0; i < count; i++) {
    const d = new Date(ms)
    const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1)
    const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - jan1) / 86_400_000)
    const aligned = jan1 + Math.floor(doy / 8) * 8 * 86_400_000
    out.push(isoDate(aligned))
    ms = aligned - 86_400_000
  }
  return out
}

async function fetchTileSet<T>(
  keys: string[], dates: string[], urlOf: (date: string, row: number, col: number) => string,
  decode: (bytes: Uint8Array) => Promise<T | null>, fetchImpl: typeof fetch, signal?: AbortSignal,
): Promise<{ date: string; tiles: Map<string, T> } | null> {
  for (const date of dates) {
    const tiles = new Map<string, T>()
    let ok = true
    await Promise.all(keys.map(async (key) => {
      const [col, row] = key.split('/').map(Number)
      const res = await fetchImpl(urlOf(date, row, col), { signal })
      if (!res.ok) { ok = false; return }
      const decoded = await decode(new Uint8Array(await res.arrayBuffer()))
      if (decoded) tiles.set(key, decoded)
    }))
    if (ok && tiles.size > 0) return { date, tiles }
  }
  return null
}

/** Fetches far-field GIBS 8-day NDVI (and optional 8-day surface reflectance RGB) over ±60 km. */
export async function fetchFarLand(
  place: Coordinate, signal?: AbortSignal, now = new Date(), deps: FarFetchDeps = {},
): Promise<FarLandGrid | null> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const decodeJpeg = deps.decodeJpeg ?? defaultDecodeJpeg
  const keys = tilesAround(place.lat, place.lon, FAR_REACH_KM, GIBS_ZOOM)
  const ndviDates = [2, 4, 7].map((d) => isoDate(now.getTime() - d * 86_400_000))
  const [ndviSet, srSet] = await Promise.all([
    fetchTileSet(keys, ndviDates, (d, r, c) => gibsNdviUrl(d, GIBS_ZOOM, r, c), decodeGibsNdviPng, fetchImpl, signal),
    fetchTileSet(keys, srCompositeDates(now), (d, r, c) => gibsSrUrl(d, GIBS_ZOOM, r, c), decodeJpeg, fetchImpl, signal).catch(() => null),
  ])
  if (!ndviSet) return null
  const size = Math.round((2 * FAR_REACH_KM) / FAR_STEP_KM)
  const ndvi = new Float32Array(size * size).fill(Number.NaN)
  const rgb = srSet ? new Uint8Array(size * size * 3) : undefined
  const cosLat = Math.cos((place.lat * Math.PI) / 180)
  for (let row = 0; row < size; row++) {
    const lat = place.lat + (FAR_REACH_KM - (row + 0.5) * FAR_STEP_KM) / 111.32
    for (let col = 0; col < size; col++) {
      const lon = place.lon + ((col + 0.5) * FAR_STEP_KM - FAR_REACH_KM) / (111.32 * cosLat)
      const pt = tileXY(lat, lon, GIBS_ZOOM)
      const tx = Math.floor(pt.x), ty = Math.floor(pt.y)
      const px = Math.min(TILE - 1, Math.floor((pt.x - tx) * TILE))
      const py = Math.min(TILE - 1, Math.floor((pt.y - ty) * TILE))
      const key = `${tx}/${ty}`, pIdx = py * TILE + px, outIdx = row * size + col
      const nTile = ndviSet.tiles.get(key)
      if (nTile) ndvi[outIdx] = nTile[pIdx]
      const sTile = srSet?.tiles.get(key)
      if (rgb && sTile) {
        const si = pIdx * 3, oi = outIdx * 3
        rgb[oi] = sTile[si]; rgb[oi + 1] = sTile[si + 1]; rgb[oi + 2] = sTile[si + 2]
      }
    }
  }
  return {
    date: ndviSet.date, source: `gibs:${ndviSet.date}`, fetchedAt: now.getTime(),
    ...(srSet ? { rgbDate: srSet.date, rgbSource: `gibs:${srSet.date}` as const, rgb } : {}),
    lat: place.lat, lon: place.lon, reachKm: FAR_REACH_KM, stepKm: FAR_STEP_KM, size, ndvi,
  }
}

/** Samples the far-field GIBS grid at `(lat, lon)`, or null outside ±60 km. */
export function farAt(
  grid: FarLandGrid, lat: number, lon: number,
): { ndvi: number | null; rgb: [number, number, number] | null; source: `gibs:${string}`; rgbSource?: `gibs:${string}` } | null {
  const nKm = (lat - grid.lat) * 111.32
  const eKm = (lon - grid.lon) * 111.32 * Math.cos((grid.lat * Math.PI) / 180)
  const col = Math.floor((eKm + grid.reachKm) / grid.stepKm)
  const row = Math.floor((grid.reachKm - nKm) / grid.stepKm)
  if (row < 0 || col < 0 || row >= grid.size || col >= grid.size) return null
  const idx = row * grid.size + col
  const v = grid.ndvi[idx]
  const ndvi = Number.isFinite(v) ? v : null
  let rgb: [number, number, number] | null = null
  if (grid.rgb) {
    const o = idx * 3
    if (grid.rgb[o] || grid.rgb[o + 1] || grid.rgb[o + 2]) rgb = [grid.rgb[o], grid.rgb[o + 1], grid.rgb[o + 2]]
  }
  if (ndvi === null && rgb === null) return null
  return { ndvi, rgb, source: grid.source, rgbSource: grid.rgbSource }
}

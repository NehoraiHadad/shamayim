import type { Coordinate } from '../landmarks/project'
import { tilesAround, tileXY } from '../terrain/dem'
import { decodeGibsNdviTile, defaultDecodeJpeg } from './gibsDecode'
import type { FarLandGrid } from './types'

/**
 * Far-field land observations (±60 km) from NASA GIBS WMTS (NASA EOSDIS public domain,
 * `Access-Control-Allow-Origin: *`). NDVI and 8-day SR RGB are fetched and validated independently
 * so blank 200 tiles, single missing tiles or one failing layer never discard sibling data.
 */
export const GIBS_WMTS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'
export const MODIS_NDVI_LAYER = 'MODIS_Terra_NDVI_8Day'
export const MODIS_SR_LAYER = 'MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day'
export const GIBS_ZOOM = 8
export const FAR_REACH_KM = 60
export const FAR_STEP_KM = 2
const TILE = 256

export interface FarFetchDeps { fetchImpl?: typeof fetch; decodeJpeg?: (bytes: Uint8Array) => Promise<Uint8Array | null> }
export interface FarSample {
  ndvi: number | null; ndviSource: `gibs:${string}` | null; ndviDate: string | null
  rgb: [number, number, number] | null; rgbSource: `gibs:${string}` | null; rgbDate: string | null
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
    const d = new Date(ms), jan1 = Date.UTC(d.getUTCFullYear(), 0, 1)
    const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - jan1) / 86_400_000)
    const aligned = jan1 + Math.floor(doy / 8) * 8 * 86_400_000
    out.push(isoDate(aligned)); ms = aligned - 86_400_000
  }
  return out
}

interface FootprintIndex { key: string; pIdx: number; outIdx: number }

function buildFootprintIndex(place: Coordinate, size: number): FootprintIndex[] {
  const out: FootprintIndex[] = [], cosLat = Math.cos((place.lat * Math.PI) / 180)
  for (let row = 0; row < size; row++) {
    const lat = place.lat + (FAR_REACH_KM - (row + 0.5) * FAR_STEP_KM) / 111.32
    for (let col = 0; col < size; col++) {
      const lon = place.lon + ((col + 0.5) * FAR_STEP_KM - FAR_REACH_KM) / (111.32 * cosLat)
      const pt = tileXY(lat, lon, GIBS_ZOOM), tx = Math.floor(pt.x), ty = Math.floor(pt.y)
      const px = Math.min(TILE - 1, Math.floor((pt.x - tx) * TILE)), py = Math.min(TILE - 1, Math.floor((pt.y - ty) * TILE))
      out.push({ key: `${tx}/${ty}`, pIdx: py * TILE + px, outIdx: row * size + col })
    }
  }
  return out
}

async function fetchLayer<T, G>(
  keys: string[], dates: string[], urlOf: (date: string, row: number, col: number) => string,
  decode: (bytes: Uint8Array) => Promise<T | null>,
  sample: (tiles: Map<string, T>) => { grid: G; validCount: number },
  fetchImpl: typeof fetch, signal?: AbortSignal,
): Promise<{ date: string; grid: G } | null> {
  for (const date of dates) {
    const tiles = new Map<string, T>()
    await Promise.all(keys.map(async (key) => {
      const [col, row] = key.split('/').map(Number)
      try {
        const res = await fetchImpl(urlOf(date, row, col), { signal })
        if (!res.ok) return
        const decoded = await decode(new Uint8Array(await res.arrayBuffer()))
        if (decoded) tiles.set(key, decoded)
      } catch (err) { if (signal?.aborted) throw err }
    }))
    if (tiles.size === 0) continue
    const sampled = sample(tiles)
    if (sampled.validCount > 0) return { date, grid: sampled.grid }
  }
  return null
}

/** Fetches far-field GIBS 8-day NDVI and 8-day surface reflectance RGB independently over ±60 km. */
export async function fetchFarLand(
  place: Coordinate, signal?: AbortSignal, now = new Date(), deps: FarFetchDeps = {},
): Promise<FarLandGrid | null> {
  const fetchImpl = deps.fetchImpl ?? fetch, decodeJpeg = deps.decodeJpeg ?? defaultDecodeJpeg
  const keys = tilesAround(place.lat, place.lon, FAR_REACH_KM, GIBS_ZOOM)
  const size = Math.round((2 * FAR_REACH_KM) / FAR_STEP_KM)
  const index = buildFootprintIndex(place, size)
  const ndviDates = [2, 4, 7].map((d) => isoDate(now.getTime() - d * 86_400_000))
  const sampleNdvi = (tiles: Map<string, Float32Array>) => {
    const grid = new Float32Array(size * size).fill(Number.NaN)
    let validCount = 0
    for (const { key, pIdx, outIdx } of index) {
      const t = tiles.get(key)
      if (t && Number.isFinite(t[pIdx])) { grid[outIdx] = t[pIdx]; validCount++ }
    }
    return { grid, validCount }
  }
  const sampleRgb = (tiles: Map<string, Uint8Array>) => {
    const grid = new Uint8Array(size * size * 3)
    let validCount = 0
    for (const { key, pIdx, outIdx } of index) {
      const t = tiles.get(key)
      if (!t) continue
      const si = pIdx * 3, r = t[si], g = t[si + 1], b = t[si + 2]
      if (r || g || b) { const oi = outIdx * 3; grid[oi] = r; grid[oi + 1] = g; grid[oi + 2] = b; validCount++ }
    }
    return { grid, validCount }
  }
  const decodeNdvi256 = async (b: Uint8Array) => { const t = await decodeGibsNdviTile(b); return t.width === TILE && t.height === TILE ? t.data : null }
  const decodeRgb256 = async (b: Uint8Array) => { const rgb = await decodeJpeg(b); return rgb && rgb.length === TILE * TILE * 3 ? rgb : null }
  const safe = <R>(p: Promise<R | null>) => p.catch((err) => { if (signal?.aborted) throw err; return null })
  const [ndviLayer, srLayer] = await Promise.all([
    safe(fetchLayer(keys, ndviDates, (d, r, c) => gibsNdviUrl(d, GIBS_ZOOM, r, c), decodeNdvi256, sampleNdvi, fetchImpl, signal)),
    safe(fetchLayer(keys, srCompositeDates(now), (d, r, c) => gibsSrUrl(d, GIBS_ZOOM, r, c), decodeRgb256, sampleRgb, fetchImpl, signal)),
  ])
  if (!ndviLayer && !srLayer) return null
  return {
    date: ndviLayer?.date ?? null, source: ndviLayer ? `gibs:${ndviLayer.date}` : null,
    ...(srLayer ? { rgbDate: srLayer.date, rgbSource: `gibs:${srLayer.date}` as const, rgb: srLayer.grid } : {}),
    fetchedAt: now.getTime(), lat: place.lat, lon: place.lon, reachKm: FAR_REACH_KM, stepKm: FAR_STEP_KM, size,
    ndvi: ndviLayer?.grid ?? new Float32Array(size * size).fill(Number.NaN),
  }
}

/** Samples the far-field GIBS grid at `(lat, lon)`, or null outside ±60 km / where both layers are nodata. */
export function farAt(grid: FarLandGrid, lat: number, lon: number): FarSample | null {
  const nKm = (lat - grid.lat) * 111.32, eKm = (lon - grid.lon) * 111.32 * Math.cos((grid.lat * Math.PI) / 180)
  const col = Math.floor((eKm + grid.reachKm) / grid.stepKm), row = Math.floor((grid.reachKm - nKm) / grid.stepKm)
  if (row < 0 || col < 0 || row >= grid.size || col >= grid.size) return null
  const idx = row * grid.size + col, v = grid.ndvi[idx]
  const ndvi = grid.source && Number.isFinite(v) ? v : null
  let rgb: [number, number, number] | null = null
  if (grid.rgb && grid.rgbSource) {
    const o = idx * 3
    if (grid.rgb[o] || grid.rgb[o + 1] || grid.rgb[o + 2]) rgb = [grid.rgb[o], grid.rgb[o + 1], grid.rgb[o + 2]]
  }
  if (ndvi === null && rgb === null) return null
  return {
    ndvi, ndviSource: ndvi !== null ? grid.source : null, ndviDate: ndvi !== null ? grid.date : null,
    rgb, rgbSource: rgb !== null ? (grid.rgbSource ?? null) : null, rgbDate: rgb !== null ? (grid.rgbDate ?? null) : null,
  }
}

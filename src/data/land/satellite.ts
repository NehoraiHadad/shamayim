import type { Coordinate } from '../landmarks/project'
import { aggregatePatch, bandScalingOf, type GridBuffers, type StacBandMeta, type StacItemProps } from './s2Math'
import type { NearCell, NearLandGrid } from './types'
import { toUtm } from './utm'

/**
 * Near-field Copernicus Sentinel-2 L2A reader (Earth Search STAC v1, open AWS COGs).
 * Reads `visual`, B04 (`red`), B08 (`nir`), B03 (`green`), B11 (`swir16`) and `scl` at the coarsest
 * overview `<= STEP_M / 2` (40 m on standard S2 COGs, aligning 10 m and 20 m bands onto one grid),
 * masks by SCL, applies BOA scale/offset and averages into `STEP_M` (100 m) cells over ±5 km.
 */
export const STAC_SEARCH = 'https://earth-search.aws.element84.com/v1/search'
export const REACH_M = 5000
export const STEP_M = 100
const MAX_OVERVIEW_RES_M = STEP_M / 2
const LOOKBACK_DAYS = 45

export interface StacAsset { href: string; 'raster:bands'?: StacBandMeta[] }
export interface StacItem {
  properties: StacItemProps
  assets: { visual?: StacAsset; red?: StacAsset; nir?: StacAsset; green?: StacAsset; swir16?: StacAsset; scl?: StacAsset }
}
export interface TiffImageLike {
  getWidth(): number
  getHeight(): number
  getBoundingBox(): number[]
  getGeoKeys(): Record<string, unknown>
  readRasters(opts: { window: number[]; width?: number; height?: number; interleave?: boolean; signal?: AbortSignal; fillValue?: number }): Promise<ArrayLike<number>>
}
export interface TiffLike { getImageCount(): Promise<number>; getImage(index: number): Promise<TiffImageLike> }
export interface NearFetchDeps { fetchImpl?: typeof fetch; openTiff?: (href: string, signal?: AbortSignal) => Promise<TiffLike> }

/** Looks up the near-field Sentinel-2 cell at `(lat, lon)`, or null outside the window / invalid. */
export function nearAt(grid: NearLandGrid, lat: number, lon: number): NearCell | null {
  const n = (lat - grid.lat) * 111_320
  const e = (lon - grid.lon) * 111_320 * Math.cos((grid.lat * Math.PI) / 180)
  const col = Math.floor((e + grid.reachM) / grid.stepM)
  const row = Math.floor((grid.reachM - n) / grid.stepM)
  if (row < 0 || col < 0 || row >= grid.size || col >= grid.size) return null
  const idx = row * grid.size + col
  const valid = grid.valid[idx]
  const o = idx * 3
  if (!(valid > 0) || (!grid.rgb[o] && !grid.rgb[o + 1] && !grid.rgb[o + 2])) return null
  const ndvi = grid.ndvi[idx], ndsi = grid.ndsi[idx]
  return {
    rgb: [grid.rgb[o], grid.rgb[o + 1], grid.rgb[o + 2]],
    ndvi: Number.isFinite(ndvi) ? ndvi : null,
    ndsi: Number.isFinite(ndsi) ? ndsi : null,
    valid,
    source: grid.source,
  }
}

async function defaultOpenTiff(href: string, signal?: AbortSignal): Promise<TiffLike> {
  const { fromUrl } = await import('geotiff')
  return fromUrl(href, { allowFullFile: false }, signal) as unknown as Promise<TiffLike>
}

async function selectOverview(tiff: TiffLike, maxResM: number) {
  const full = await tiff.getImage(0)
  const [west, , east] = full.getBoundingBox()
  const fullRes = (east - west) / full.getWidth()
  const count = await tiff.getImageCount()
  let img = full, res = fullRes
  for (let i = 1; i < count; i++) {
    const cand = await tiff.getImage(i)
    const candRes = fullRes * (full.getWidth() / cand.getWidth())
    if (candRes <= maxResM && candRes > res) { img = cand; res = candRes }
  }
  return { full, img, res }
}

async function readBand(
  asset: StacAsset, place: Coordinate, targetW: number, targetH: number,
  openTiff: NonNullable<NearFetchDeps['openTiff']>, signal?: AbortSignal,
) {
  const tiff = await openTiff(asset.href, signal)
  const { full, img, res } = await selectOverview(tiff, MAX_OVERVIEW_RES_M)
  const [west, , , north] = full.getBoundingBox()
  const epsg = Number(full.getGeoKeys().ProjectedCSTypeGeoKey)
  const south = epsg >= 32701 && epsg <= 32760
  const zone = south ? epsg - 32700 : epsg - 32600
  if (!Number.isFinite(zone) || zone < 1 || zone > 60) return null
  const rawUtm = toUtm(place.lat, place.lon, zone)
  const p = { e: rawUtm.e, n: south ? rawUtm.n + 10_000_000 : rawUtm.n }
  const px = (e: number) => Math.round((e - west) / res), py = (n: number) => Math.round((north - n) / res)
  const win = [px(p.e - REACH_M), py(p.n + REACH_M), px(p.e + REACH_M), py(p.n - REACH_M)]
  if (win[2] <= 0 || win[0] >= img.getWidth() || win[3] <= 0 || win[1] >= img.getHeight()) return null
  const width = targetW || win[2] - win[0], height = targetH || win[3] - win[1]
  const data = await img.readRasters({ window: win, width, height, interleave: true, signal, fillValue: 0 })
  return { data, width, height }
}

async function readItemWindow(
  item: StacItem, place: Coordinate, out: GridBuffers,
  openTiff: NonNullable<NearFetchDeps['openTiff']>, signal?: AbortSignal,
): Promise<void> {
  const { visual, red, nir, scl, green, swir16 } = item.assets
  if (!visual || !red || !nir || !scl) return
  const sclRead = await readBand(scl, place, 0, 0, openTiff, signal)
  if (!sclRead) return
  const { width, height } = sclRead
  const opt = (a?: StacAsset) => (a && green && swir16 ? readBand(a, place, width, height, openTiff, signal).catch(() => null) : Promise.resolve(null))
  const [visRead, redRead, nirRead, greenRead, swirRead] = await Promise.all([
    readBand(visual, place, width, height, openTiff, signal),
    readBand(red, place, width, height, openTiff, signal),
    readBand(nir, place, width, height, openTiff, signal),
    opt(green), opt(swir16),
  ])
  if (!visRead || !redRead || !nirRead) return
  const props = item.properties
  aggregatePatch({
    width, height, visual: visRead.data as Uint8Array, red: redRead.data, nir: nirRead.data, scl: sclRead.data as Uint8Array,
    redScale: bandScalingOf(props, red['raster:bands']?.[0]), nirScale: bandScalingOf(props, nir['raster:bands']?.[0]),
    green: greenRead && swirRead ? greenRead.data : undefined, swir: greenRead && swirRead ? swirRead.data : undefined,
    greenScale: green ? bandScalingOf(props, green['raster:bands']?.[0]) : undefined,
    swirScale: swir16 ? bandScalingOf(props, swir16['raster:bands']?.[0]) : undefined,
  }, out)
}

export async function fetchNearLand(
  place: Coordinate, signal?: AbortSignal, now = new Date(), deps: NearFetchDeps = {},
): Promise<NearLandGrid | null> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const openTiff = deps.openTiff ?? defaultOpenTiff
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString()
  const query = new URLSearchParams({
    collections: 'sentinel-2-l2a', limit: '12', sortby: '-properties.datetime',
    bbox: `${place.lon - 0.05},${place.lat - 0.05},${place.lon + 0.05},${place.lat + 0.05}`,
    datetime: `${from}/${now.toISOString()}`, query: JSON.stringify({ 'eo:cloud_cover': { lt: 20 } }),
  })
  const response = await fetchImpl(`${STAC_SEARCH}?${query}`, { signal })
  if (!response.ok) return null
  const items = ((await response.json()) as { features?: StacItem[] }).features ?? []
  if (!items.length) return null
  const first = items[0], date = first.properties.datetime.slice(0, 10)
  const size = Math.round((2 * REACH_M) / STEP_M)
  const out: GridBuffers = {
    size, rgb: new Uint8Array(size * size * 3),
    ndvi: new Float32Array(size * size).fill(Number.NaN),
    ndsi: new Float32Array(size * size).fill(Number.NaN),
    valid: new Float32Array(size * size),
  }
  for (const item of items.filter((it) => it.properties.datetime.slice(0, 10) === date)) {
    await readItemWindow(item, place, out, openTiff, signal)
  }
  return {
    date, source: `s2:${date}`, fetchedAt: now.getTime(), lat: place.lat, lon: place.lon,
    reachM: REACH_M, stepM: STEP_M, ...out,
    sunElevation: first.properties['view:sun_elevation'], sunAzimuth: first.properties['view:sun_azimuth'],
  }
}

import type { Coordinate } from '../landmarks/project'
import { alignBandToScl } from './alignBand'
import { defaultOpenTiff, readCogWindow, type OpenTiffFn, type UtmBox, type UtmCrs } from './cogReader'
import { dominantGeometry, gridCoverage, makeNearBuffers, mergeOlderGrid } from './nearGrid'
import { aggregatePatch, type GridBuffers, type GridTransform } from './s2Aggregate'
import { bandScalingOf, type StacBandMeta, type StacItemProps } from './s2Math'
import type { AcquisitionGeometry, NearLandGrid } from './types'
import { toUtm, utmBoxToWgs84Bbox, utmZoneOf } from './utm'

/**
 * Near-field Copernicus Sentinel-2 L2A reader (Earth Search STAC v1, open AWS COGs).
 * Aligns each spectral/visual band onto the SCL lattice in UTM, composites up to 4 newest-first
 * acquisition dates so deficient channels/cells fill from older clear passes with their own dates,
 * and stops early once both RGB and NDVI clear the overall and central-footprint coverage gates.
 */
export const STAC_SEARCH = 'https://earth-search.aws.element84.com/v1/search'
export const REACH_M = 5000, STEP_M = 100, MAX_OVERVIEW_RES_M = STEP_M / 2
const LOOKBACK_DAYS = 45, MAX_DATES_TO_TRY = 4
const MIN_USABLE_CELL_VALID = 0.2, MIN_GRID_COVERAGE = 0.05
const COMPLETE_COVERAGE = 0.85, COMPLETE_CENTER = 0.5

export interface StacAsset { href: string; 'raster:bands'?: StacBandMeta[] }
export interface StacItem {
  properties: StacItemProps
  assets: { visual?: StacAsset; red?: StacAsset; nir?: StacAsset; green?: StacAsset; swir16?: StacAsset; scl?: StacAsset }
}
export type { TiffImageLike, TiffLike } from './cogReader'
export interface NearFetchDeps { fetchImpl?: typeof fetch; openTiff?: OpenTiffFn }

async function readItemWindow(
  item: StacItem, targetBox: UtmBox, targetCrs: UtmCrs, grid: GridTransform,
  out: GridBuffers, acqId: number, openTiff: OpenTiffFn, signal?: AbortSignal,
): Promise<boolean> {
  const { visual, red, nir, scl, green, swir16 } = item.assets
  if (!scl) return false
  const props = item.properties
  const redScale = red ? bandScalingOf(props, red['raster:bands']?.[0]) : null
  const nirScale = nir ? bandScalingOf(props, nir['raster:bands']?.[0]) : null
  const greenScale = green ? bandScalingOf(props, green['raster:bands']?.[0]) : null
  const swirScale = swir16 ? bandScalingOf(props, swir16['raster:bands']?.[0]) : null
  const hasSpectral = Boolean(red && nir && redScale && nirScale)
  if (!visual && !hasSpectral) return false

  const sclRead = await readCogWindow(scl.href, targetBox, targetCrs, MAX_OVERVIEW_RES_M, openTiff, { signal })
  if (!sclRead) return false
  const sclBox: UtmBox = {
    minE: sclRead.west, maxN: sclRead.north,
    maxE: sclRead.west + sclRead.width * sclRead.resX,
    minN: sclRead.north - sclRead.height * sclRead.resY,
  }
  const sclCrs: UtmCrs = { zone: sclRead.zone, south: sclRead.south }
  const safeRead = (asset?: StacAsset) =>
    asset
      ? readCogWindow(asset.href, sclBox, sclCrs, MAX_OVERVIEW_RES_M, openTiff, { signal })
          .catch((err) => { if (signal?.aborted) throw err; return null })
      : Promise.resolve(null)

  const [visRead, redRead, nirRead, greenRead, swirRead] = await Promise.all([
    safeRead(visual), hasSpectral ? safeRead(red) : Promise.resolve(null), hasSpectral ? safeRead(nir) : Promise.resolve(null),
    greenScale && swirScale ? safeRead(green) : Promise.resolve(null), greenScale && swirScale ? safeRead(swir16) : Promise.resolve(null),
  ])
  if (!visRead && !(redRead && nirRead)) return false

  aggregatePatch({
    width: sclRead.width, height: sclRead.height,
    west: sclRead.west, north: sclRead.north, resX: sclRead.resX, resY: sclRead.resY,
    zone: sclRead.zone, south: sclRead.south, acqId,
    scl: sclRead.data as Uint8Array,
    visual: visRead ? alignBandToScl(visRead, sclRead, 3) : undefined,
    red: redRead && nirRead ? alignBandToScl(redRead, sclRead, 1) : undefined,
    nir: redRead && nirRead ? alignBandToScl(nirRead, sclRead, 1) : undefined,
    redScale: redScale ?? undefined, nirScale: nirScale ?? undefined,
    green: greenRead && swirRead ? alignBandToScl(greenRead, sclRead, 1) : undefined,
    swir: greenRead && swirRead ? alignBandToScl(swirRead, sclRead, 1) : undefined,
    greenScale: greenScale ?? undefined, swirScale: swirScale ?? undefined,
  }, grid, out)
  return true
}

export async function fetchNearLand(
  place: Coordinate, signal?: AbortSignal, now = new Date(), deps: NearFetchDeps = {},
): Promise<NearLandGrid | null> {
  const fetchImpl = deps.fetchImpl ?? fetch, openTiff = deps.openTiff ?? defaultOpenTiff
  const utmZone = utmZoneOf(place.lon), utmSouth = place.lat < 0
  const center = toUtm(place.lat, place.lon, utmZone, utmSouth)
  const originE = center.e - REACH_M, originN = center.n + REACH_M
  const targetBox: UtmBox = { minE: originE, minN: center.n - REACH_M, maxE: center.e + REACH_M, maxN: originN }
  const targetCrs: UtmCrs = { zone: utmZone, south: utmSouth }
  const bbox = utmBoxToWgs84Bbox(targetBox.minE, targetBox.minN, targetBox.maxE, targetBox.maxN, utmZone, utmSouth)
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString()
  const query = new URLSearchParams({
    collections: 'sentinel-2-l2a', limit: '24', sortby: '-properties.datetime',
    bbox: bbox.map((v) => v.toFixed(6)).join(','),
    datetime: `${from}/${now.toISOString()}`, query: JSON.stringify({ 'eo:cloud_cover': { lt: 20 } }),
  })
  const response = await fetchImpl(`${STAC_SEARCH}?${query}`, { signal })
  if (!response.ok) return null
  const items = ((await response.json()) as { features?: StacItem[] }).features ?? []
  if (!items.length) return null

  const byDate = new Map<string, StacItem[]>()
  for (const item of items) {
    const d = item.properties.datetime.slice(0, 10)
    const list = byDate.get(d) ?? []
    list.push(item)
    byDate.set(d, list)
  }

  const size = Math.round((2 * REACH_M) / STEP_M)
  const transform: GridTransform = { size, originE, originN, stepM: STEP_M, utmZone, utmSouth }
  const composite = makeNearBuffers(size)
  const acquisitions: AcquisitionGeometry[] = []
  let newestDate: string | null = null
  let tried = 0

  for (const [date, group] of byDate) {
    if (++tried > MAX_DATES_TO_TRY) break
    const dayBuf = makeNearBuffers(size)
    for (const item of group) {
      if (acquisitions.length >= 254) break
      const acqId = acquisitions.length
      acquisitions.push({ date, sunElevation: item.properties['view:sun_elevation'], sunAzimuth: item.properties['view:sun_azimuth'] })
      try {
        await readItemWindow(item, targetBox, targetCrs, transform, dayBuf, acqId, openTiff, signal)
      } catch (err) {
        if (signal?.aborted) throw err
      }
    }
    const dayCov = gridCoverage(dayBuf, MIN_USABLE_CELL_VALID)
    if (dayCov.any === 0) continue
    if (!newestDate) newestDate = date
    mergeOlderGrid(composite, dayBuf, MIN_USABLE_CELL_VALID)
    const cov = gridCoverage(composite, MIN_USABLE_CELL_VALID)
    if (cov.rgb >= COMPLETE_COVERAGE && cov.ndvi >= COMPLETE_COVERAGE && cov.centerRgb >= COMPLETE_CENTER && cov.centerNdvi >= COMPLETE_CENTER) {
      break
    }
  }

  const finalCov = gridCoverage(composite, MIN_USABLE_CELL_VALID)
  if (!newestDate || finalCov.any < MIN_GRID_COVERAGE) return null
  const dom = dominantGeometry(composite, acquisitions)
  return {
    date: newestDate, source: `s2:${newestDate}`, fetchedAt: now.getTime(),
    lat: place.lat, lon: place.lon, utmZone, utmSouth, originE, originN,
    reachM: REACH_M, stepM: STEP_M, ...composite, acquisitions,
    sunElevation: dom?.sunElevation, sunAzimuth: dom?.sunAzimuth,
  }
}

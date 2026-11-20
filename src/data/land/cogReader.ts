import { fromUtm, toUtm } from './utm'

/**
 * Shared georeferenced Cloud-Optimized GeoTIFF (COG) overview selector and window reader.
 * Used by both the production Sentinel-2 reader (`satellite.ts`) and the offline fixture recorder
 * (`scripts/land/recordFixtures.ts`) so both paths share identical CRS and window math.
 *
 * Overview resampling semantics on Earth Search Sentinel-2 L2A COGs (GDAL-generated):
 * - Continuous reflectance (`red`, `nir`, `green`, `swir16`) and `visual` bands use `AVERAGE` overviews.
 * - Categorical `scl` uses `MODE` (or `NEAREST`) overviews.
 * Sampling at the coarsest overview `<= maxResM` (40 m on standard 10 m / 20 m S2 COGs) keeps browser
 * range reads to ~250×250 px/band while noting that cloud-edge 40 m overview pixels can blend clear and
 * cloudy native 10 m reflectance samples even when SCL mode reports clear.
 */

export interface TiffImageLike {
  getWidth(): number
  getHeight(): number
  getBoundingBox(): number[]
  getGeoKeys(): Record<string, unknown>
  readRasters(opts: {
    window: number[]
    width?: number
    height?: number
    interleave?: boolean
    signal?: AbortSignal
    fillValue?: number
  }): Promise<ArrayLike<number>>
}

export interface TiffLike {
  getImageCount(): Promise<number>
  getImage(index: number): Promise<TiffImageLike>
}

export type OpenTiffFn = (href: string, signal?: AbortSignal) => Promise<TiffLike>

export interface UtmCrs { zone: number; south: boolean }
export interface UtmBox { minE: number; minN: number; maxE: number; maxN: number }

export interface CogWindow {
  data: ArrayLike<number>
  width: number
  height: number
  /** Exact UTM west and north edge of pixel `(0, 0)` in `(zone, south)`. */
  west: number
  north: number
  resX: number
  resY: number
  zone: number
  south: boolean
}

export async function defaultOpenTiff(href: string, signal?: AbortSignal): Promise<TiffLike> {
  const { fromUrl } = await import('geotiff')
  return fromUrl(href, { allowFullFile: false }, signal) as unknown as Promise<TiffLike>
}

/** Parses northern (`EPSG:32601–32660`) and southern (`EPSG:32701–32760`) WGS84 UTM CRS codes. */
export function crsFromGeoKeys(geoKeys: Record<string, unknown>): UtmCrs | null {
  const epsg = Number(geoKeys.ProjectedCSTypeGeoKey)
  if (!Number.isInteger(epsg)) return null
  if (epsg >= 32601 && epsg <= 32660) return { zone: epsg - 32600, south: false }
  if (epsg >= 32701 && epsg <= 32760) return { zone: epsg - 32700, south: true }
  return null
}

/** Selects the coarsest overview whose ground sample distance is `<= maxResM`. */
export async function selectOverview(tiff: TiffLike, maxResM: number) {
  const full = await tiff.getImage(0)
  const [west, south, east, north] = full.getBoundingBox()
  const fullRes = (east - west) / full.getWidth()
  const count = await tiff.getImageCount()
  let img = full
  let res = fullRes
  for (let i = 1; i < count; i++) {
    const cand = await tiff.getImage(i)
    const candRes = fullRes * (full.getWidth() / cand.getWidth())
    if (candRes <= maxResM && candRes > res) { img = cand; res = candRes }
  }
  return { full, img, res, bbox: [west, south, east, north] as const }
}

/** Projects a UTM box into another UTM CRS when granules straddle a 6° zone boundary. */
function reprojectBox(box: UtmBox, from: UtmCrs, to: UtmCrs): UtmBox {
  if (from.zone === to.zone && from.south === to.south) return box
  const pts = [
    fromUtm(box.minE, box.minN, from.zone, from.south),
    fromUtm(box.maxE, box.minN, from.zone, from.south),
    fromUtm(box.minE, box.maxN, from.zone, from.south),
    fromUtm(box.maxE, box.maxN, from.zone, from.south),
  ].map((p) => toUtm(p.lat, p.lon, to.zone, to.south))
  return {
    minE: Math.min(...pts.map((p) => p.e)),
    minN: Math.min(...pts.map((p) => p.n)),
    maxE: Math.max(...pts.map((p) => p.e)),
    maxN: Math.max(...pts.map((p) => p.n)),
  }
}

/** Reads the clipped georeferenced pixel window covering `targetBox` (in `targetCrs`) from a UTM COG. */
export async function readCogWindow(
  href: string,
  targetBox: UtmBox,
  targetCrs: UtmCrs,
  maxResM: number,
  openTiff: OpenTiffFn,
  opts: { signal?: AbortSignal; forceSize?: { width: number; height: number } } = {},
): Promise<CogWindow | null> {
  const tiff = await openTiff(href, opts.signal)
  const { full, img, bbox } = await selectOverview(tiff, maxResM)
  const itemCrs = crsFromGeoKeys(full.getGeoKeys())
  if (!itemCrs) return null
  const [tileWest, tileSouth, tileEast, tileNorth] = bbox
  const imgW = img.getWidth(), imgH = img.getHeight()
  const rawResX = (tileEast - tileWest) / imgW
  const rawResY = (tileNorth - tileSouth) / imgH
  const box = reprojectBox(targetBox, targetCrs, itemCrs)

  const x0 = Math.max(0, Math.floor((box.minE - tileWest) / rawResX))
  const y0 = Math.max(0, Math.floor((tileNorth - box.maxN) / rawResY))
  const x1 = Math.min(imgW, Math.ceil((box.maxE - tileWest) / rawResX))
  const y1 = Math.min(imgH, Math.ceil((tileNorth - box.minN) / rawResY))
  if (x1 <= x0 || y1 <= y0) return null

  const width = opts.forceSize?.width ?? (x1 - x0)
  const height = opts.forceSize?.height ?? (y1 - y0)
  const data = await img.readRasters({
    window: [x0, y0, x1, y1], width, height, interleave: true, signal: opts.signal, fillValue: 0,
  })
  const west = tileWest + x0 * rawResX
  const north = tileNorth - y0 * rawResY
  return {
    data, width, height, west, north,
    resX: ((x1 - x0) * rawResX) / width,
    resY: ((y1 - y0) * rawResY) / height,
    zone: itemCrs.zone, south: itemCrs.south,
  }
}

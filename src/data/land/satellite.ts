import type { Coordinate } from '../landmarks/project'
import { toUtm } from './utm'

/**
 * This week's colour of the land: the newest clear Copernicus Sentinel-2 L2A scene over the place (cloud under 20 %, the
 * last 45 days), read as a window of its true-colour image at 20 m and averaged into a coarse grid (`STEP_M`). Green
 * after rain, straw in summer, ploughed brown, snow on a peak: whatever the satellite saw last.
 */
const STAC = 'https://earth-search.aws.element84.com/v1/search'
/** Half the window's side (m), and the grid it is kept at (m). */
export const REACH_M = 5000
export const STEP_M = 100

export interface LandColour {
  /** The scene's date (YYYY-MM-DD). */
  date: string
  fetchedAt: number
  lat: number
  lon: number
  /** Cells across the window: `size` × `size`, row-major from the north-west; RGB bytes. */
  size: number
  rgb: Uint8Array
}

/** Metres east and north of the place to the colour grid's [row, col]. */
export function colourAt(colour: LandColour, lat: number, lon: number): [number, number, number] | null {
  const n = (lat - colour.lat) * 111_320
  const e = (lon - colour.lon) * 111_320 * Math.cos((colour.lat * Math.PI) / 180)
  const col = Math.floor((e + REACH_M) / STEP_M), row = Math.floor((REACH_M - n) / STEP_M)
  if (row < 0 || col < 0 || row >= colour.size || col >= colour.size) return null
  const i = (row * colour.size + col) * 3
  const { rgb } = colour
  return rgb[i] || rgb[i + 1] || rgb[i + 2] ? [rgb[i], rgb[i + 1], rgb[i + 2]] : null
}

interface StacItem { properties: { datetime: string }; assets: { visual: { href: string } } }

/** One scene's true-colour window around the place, averaged into the grid; empty cells stay 0 (outside the tile). */
async function readWindow(href: string, place: Coordinate, size: number, rgb: Uint8Array, signal?: AbortSignal) {
  const { fromUrl } = await import('geotiff')
  const tiff = await fromUrl(href, { allowFullFile: false }, signal)
  const full = await tiff.getImage(0)
  const [west, , east, north] = full.getBoundingBox()
  const zone = (full.getGeoKeys().ProjectedCSTypeGeoKey as number) - 32600
  const overview = await tiff.getImage(1)
  const res = ((east - west) / full.getWidth()) * (full.getWidth() / overview.getWidth())
  const p = toUtm(place.lat, place.lon, zone)
  const px = (e: number) => Math.round((e - west) / res), py = (n: number) => Math.round((north - n) / res)
  const window = [px(p.e - REACH_M), py(p.n + REACH_M), px(p.e + REACH_M), py(p.n - REACH_M)]
  const data = await overview.readRasters({ window, interleave: true, signal, fillValue: 0 }) as unknown as Uint8Array
  const width = window[2] - window[0]
  const block = STEP_M / res
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const o = (row * size + col) * 3
      if (rgb[o] || rgb[o + 1] || rgb[o + 2]) continue
      let r = 0, g = 0, b = 0, count = 0
      for (let y = Math.floor(row * block); y < Math.floor((row + 1) * block); y++) {
        for (let x = Math.floor(col * block); x < Math.floor((col + 1) * block); x++) {
          const i = (y * width + x) * 3
          if (!data[i] && !data[i + 1] && !data[i + 2]) continue
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
        }
      }
      if (count) { rgb[o] = r / count; rgb[o + 1] = g / count; rgb[o + 2] = b / count }
    }
  }
}

export async function fetchLandColour(place: Coordinate, signal?: AbortSignal, now = new Date()): Promise<LandColour | null> {
  const from = new Date(now.getTime() - 45 * 86_400_000).toISOString()
  const query = new URLSearchParams({ collections: 'sentinel-2-l2a', limit: '12', sortby: '-properties.datetime',
    bbox: `${place.lon - .05},${place.lat - .05},${place.lon + .05},${place.lat + .05}`, datetime: `${from}/${now.toISOString()}`,
    query: JSON.stringify({ 'eo:cloud_cover': { lt: 20 } }) })
  const response = await fetch(`${STAC}?${query}`, { signal })
  if (!response.ok) return null
  const items = ((await response.json()) as { features: StacItem[] }).features
  if (!items.length) return null
  // The newest pass, and every tile of it (a place near a tile's edge needs its neighbour to fill the window).
  const date = items[0].properties.datetime.slice(0, 10)
  const size = Math.round((2 * REACH_M) / STEP_M)
  const rgb = new Uint8Array(size * size * 3)
  for (const item of items.filter(item => item.properties.datetime.slice(0, 10) === date)) {
    await readWindow(item.assets.visual.href, place, size, rgb, signal)
  }
  return { date, fetchedAt: now.getTime(), lat: place.lat, lon: place.lon, size, rgb }
}

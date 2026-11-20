/**
 * One-shot fixture recorder for living-land Stage 1 unit tests (hits live STAC/COG, NASA GIBS and
 * Open-Meteo ONCE; unit tests never touch the network).
 *
 * Usage: `npx tsx scripts/land/recordFixtures.ts`
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fromUrl } from 'geotiff'
import { SHADMOT_MEHOLA } from '../../src/config/place'
import { gibsNdviUrl, GIBS_ZOOM } from '../../src/data/land/gibs'
import { decodeGibsNdviPng } from '../../src/data/land/gibsDecode'
import { recentWeatherUrl } from '../../src/data/land/recentWeather'
import { STAC_SEARCH } from '../../src/data/land/satellite'
import { toUtm } from '../../src/data/land/utm'
import { tileXY } from '../../src/data/terrain/dem'

const OUT_DIR = path.resolve('src/test/fixtures')
const PATCH = 10

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

/** Encodes a tiny valid colorType=3 indexed PNG (filter 0) from raw palette indices. */
function encodeIndexedPng(width: number, height: number, indices: Uint8Array): Uint8Array {
  const sig = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = new Uint8Array(13)
  const dv = new DataView(ihdr.buffer)
  dv.setUint32(0, width); dv.setUint32(4, height)
  ihdr[8] = 8; ihdr[9] = 3 // 8-bit indexed
  const raw = new Uint8Array(height * (width + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0
    raw.set(indices.subarray(y * width, (y + 1) * width), y * (width + 1) + 1)
  }
  const idat = new Uint8Array(zlib.deflateSync(raw))
  const parts = [sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', new Uint8Array(0))]
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  parts.reduce((off, p) => { out.set(p, off); return off + p.length }, 0)
  return out
}

async function recordSentinel2() {
  const place = SHADMOT_MEHOLA
  const query = new URLSearchParams({
    collections: 'sentinel-2-l2a', limit: '1', sortby: '-properties.datetime',
    bbox: `${place.lon - 0.05},${place.lat - 0.05},${place.lon + 0.05},${place.lat + 0.05}`,
    query: JSON.stringify({ 'eo:cloud_cover': { lt: 20 } }),
  })
  const item = ((await (await fetch(`${STAC_SEARCH}?${query}`)).json()) as { features: Record<string, unknown>[] }).features[0]
  const props = item.properties as Record<string, unknown>
  const assets = item.assets as Record<string, { href: string; 'raster:bands'?: unknown[] }>

  const readPatch = async (key: string) => {
    const tiff = await fromUrl(assets[key].href, { allowFullFile: false })
    const full = await tiff.getImage(0)
    const [west, , east, north] = full.getBoundingBox()
    const fullRes = (east - west) / full.getWidth()
    const count = await tiff.getImageCount()
    let img = full, res = fullRes
    for (let i = 1; i < count; i++) {
      const c = await tiff.getImage(i)
      const cr = fullRes * (full.getWidth() / c.getWidth())
      if (cr <= 50 && cr > res) { img = c; res = cr }
    }
    const zone = Number(full.getGeoKeys().ProjectedCSTypeGeoKey) - 32600
    const p = toUtm(place.lat, place.lon, zone)
    const cx = Math.round((p.e - west) / res), cy = Math.round((north - p.n) / res)
    const half = PATCH / 2
    const data = await img.readRasters({ window: [cx - half, cy - half, cx + half, cy + half], interleave: true, fillValue: 0 })
    return { res, data: Array.from(data as ArrayLike<number>), rasterBands: assets[key]['raster:bands'] ?? [] }
  }

  const [visual, red, nir, green, swir16, scl] = await Promise.all([
    readPatch('visual'), readPatch('red'), readPatch('nir'), readPatch('green'), readPatch('swir16'), readPatch('scl'),
  ])

  const fixture = {
    _note: 'Recorded from Element84 Earth Search Sentinel-2 L2A COGs at 40 m overview around 32.3465,35.5325',
    id: item.id,
    lat: place.lat,
    lon: place.lon,
    width: PATCH,
    height: PATCH,
    properties: {
      datetime: props.datetime,
      's2:processing_baseline': props['s2:processing_baseline'],
      'earthsearch:boa_offset_applied': props['earthsearch:boa_offset_applied'],
      'view:sun_elevation': props['view:sun_elevation'],
      'view:sun_azimuth': props['view:sun_azimuth'],
    },
    bands: { visual, red, nir, green, swir16, scl },
  }
  fs.writeFileSync(path.join(OUT_DIR, 'land-s2-shadmot.json'), JSON.stringify(fixture, null, 2))
  console.log('Wrote land-s2-shadmot.json', item.id)
}

async function recordGibs() {
  const place = SHADMOT_MEHOLA
  const date = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)
  const pt = tileXY(place.lat, place.lon, GIBS_ZOOM)
  const col = Math.floor(pt.x), row = Math.floor(pt.y)
  const px = Math.floor((pt.x - col) * 256), py = Math.floor((pt.y - row) * 256)
  const url = gibsNdviUrl(date, GIBS_ZOOM, row, col)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GIBS HTTP ${res.status} for ${url}`)
  const png = new Uint8Array(await res.arrayBuffer())
  const decoded = await decodeGibsNdviPng(png)
  // Extract a small 16×16 window around the place pixel and also capture raw palette refs for a tiny PNG fixture.
  const size = 16, x0 = Math.max(0, px - 8), y0 = Math.max(0, py - 8)
  const ndviCrop: (number | null)[] = []
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      const v = decoded[y * 256 + x]
      ndviCrop.push(Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null)
    }
  }
  // Also record a tiny 8×8 indexed PNG encoded from representative MODIS_NDVI palette refs (0, 2, 23, 55, 89, 123, 142).
  const sampleRefs = Uint8Array.from({ length: 64 }, (_, i) => [0, 1, 2, 23, 55, 89, 123, 142][i % 8])
  const samplePngBase64 = Buffer.from(encodeIndexedPng(8, 8, sampleRefs)).toString('base64')
  const fixture = {
    _note: 'Recorded from NASA GIBS MODIS_Terra_NDVI_8Day WMTS (z8) + 8x8 indexed PNG built with exact MODIS_NDVI refs',
    url, date, zoom: GIBS_ZOOM, row, col, cropOrigin: { x0, y0, size }, ndviCrop, samplePngBase64,
  }
  fs.writeFileSync(path.join(OUT_DIR, 'land-gibs-ndvi.json'), JSON.stringify(fixture, null, 2))
  console.log('Wrote land-gibs-ndvi.json', date, 'valid crop px:', ndviCrop.filter((v) => v !== null).length)
}

async function recordRecentWeather() {
  const url = recentWeatherUrl(SHADMOT_MEHOLA, '')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const body = await res.json()
  fs.writeFileSync(path.join(OUT_DIR, 'land-weather-shadmot.json'), JSON.stringify(body, null, 2))
  console.log('Wrote land-weather-shadmot.json')
}

fs.mkdirSync(OUT_DIR, { recursive: true })
await Promise.all([recordSentinel2(), recordGibs(), recordRecentWeather()])

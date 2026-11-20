/**
 * One-shot fixture recorder for living-land Stage 1 unit tests (hits live STAC/COG, NASA GIBS and
 * Open-Meteo ONCE; unit tests never touch the network). Reuses `cogReader.ts` so the recorder and
 * production Sentinel-2 reader share identical CRS and window math.
 *
 * Usage: `npx tsx scripts/land/recordFixtures.ts`
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { SHADMOT_MEHOLA } from '../../src/config/place'
import { defaultOpenTiff, readCogWindow } from '../../src/data/land/cogReader'
import { gibsNdviUrl, GIBS_ZOOM } from '../../src/data/land/gibs'
import { parseIndexedPng } from '../../src/data/land/gibsDecode'
import { recentWeatherUrl } from '../../src/data/land/recentWeather'
import { MAX_OVERVIEW_RES_M, STAC_SEARCH } from '../../src/data/land/satellite'
import { toUtm, utmBoxToWgs84Bbox, utmZoneOf } from '../../src/data/land/utm'
import { tileXY } from '../../src/data/terrain/dem'

const OUT_DIR = path.resolve('src/test/fixtures')
const PATCH_HALF_M = 200 // 400 m × 400 m => 10×10 px at 40 m overview

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

/** Losslessly encodes an indexed PNG preserving the original GIBS `PLTE` and `tRNS` chunks. */
function encodeIndexedPng(width: number, height: number, indices: Uint8Array, plte: Uint8Array, trns: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13)
  new DataView(ihdr.buffer).setUint32(0, width)
  new DataView(ihdr.buffer).setUint32(4, height)
  ihdr[8] = 8; ihdr[9] = 3
  const raw = new Uint8Array(height * (width + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0
    raw.set(indices.subarray(y * width, (y + 1) * width), y * (width + 1) + 1)
  }
  const parts = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('PLTE', plte),
    ...(trns.length > 0 ? [pngChunk('tRNS', trns)] : []),
    pngChunk('IDAT', new Uint8Array(zlib.deflateSync(raw))),
    pngChunk('IEND', new Uint8Array(0)),
  ]
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  parts.reduce((off, p) => { out.set(p, off); return off + p.length }, 0)
  return out
}

async function recordSentinel2() {
  const place = SHADMOT_MEHOLA
  const zone = utmZoneOf(place.lon), south = place.lat < 0
  const center = toUtm(place.lat, place.lon, zone, south)
  const box = { minE: center.e - PATCH_HALF_M, minN: center.n - PATCH_HALF_M, maxE: center.e + PATCH_HALF_M, maxN: center.n + PATCH_HALF_M }
  const bbox = utmBoxToWgs84Bbox(box.minE, box.minN, box.maxE, box.maxN, zone, south)
  const query = new URLSearchParams({
    collections: 'sentinel-2-l2a', limit: '1', sortby: '-properties.datetime',
    bbox: bbox.map((v) => v.toFixed(6)).join(','),
    query: JSON.stringify({ 'eo:cloud_cover': { lt: 20 } }),
  })
  const item = ((await (await fetch(`${STAC_SEARCH}?${query}`)).json()) as { features: Record<string, unknown>[] }).features[0]
  const props = item.properties as Record<string, unknown>
  const assets = item.assets as Record<string, { href: string; 'raster:bands'?: unknown[] }>

  const readPatch = async (key: string) => {
    const win = await readCogWindow(assets[key].href, box, { zone, south }, MAX_OVERVIEW_RES_M, defaultOpenTiff)
    if (!win) throw new Error(`Missing COG window for ${key}`)
    return {
      res: win.resX, west: win.west, north: win.north, width: win.width, height: win.height,
      data: Array.from(win.data), rasterBands: assets[key]['raster:bands'] ?? [],
    }
  }
  const [visual, red, nir, green, swir16, scl] = await Promise.all([
    readPatch('visual'), readPatch('red'), readPatch('nir'), readPatch('green'), readPatch('swir16'), readPatch('scl'),
  ])
  const fixture = {
    _note: 'Recorded from Element84 Earth Search Sentinel-2 L2A COGs at 40 m overview around 32.3465,35.5325',
    id: item.id, lat: place.lat, lon: place.lon, width: scl.width, height: scl.height,
    properties: {
      datetime: props.datetime, 's2:processing_baseline': props['s2:processing_baseline'],
      'earthsearch:boa_offset_applied': props['earthsearch:boa_offset_applied'],
      'view:sun_elevation': props['view:sun_elevation'], 'view:sun_azimuth': props['view:sun_azimuth'],
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
  const parsed = await parseIndexedPng(new Uint8Array(await res.arrayBuffer()))
  const size = 16, x0 = Math.max(0, px - 8), y0 = Math.max(0, py - 8)
  const cropIndices = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) cropIndices[y * size + x] = parsed.indices[(y0 + y) * parsed.width + (x0 + x)]
  }
  const cropPngBase64 = Buffer.from(encodeIndexedPng(size, size, cropIndices, parsed.plte, parsed.trns)).toString('base64')
  // Blank 8×8 tile using the exact GIBS PLTE + tRNS with all pixels set to transparent index 0.
  const blankPngBase64 = Buffer.from(encodeIndexedPng(8, 8, new Uint8Array(64), parsed.plte, parsed.trns)).toString('base64')
  const fixture = {
    _note: 'Lossless 16×16 crop of a genuine NASA GIBS MODIS_Terra_NDVI_8Day PNG preserving its exact PLTE and tRNS chunks',
    url, date, zoom: GIBS_ZOOM, row, col, cropOrigin: { x0, y0, size },
    cropIndices: Array.from(cropIndices), cropPngBase64, blankPngBase64,
  }
  fs.writeFileSync(path.join(OUT_DIR, 'land-gibs-ndvi.json'), JSON.stringify(fixture, null, 2))
  console.log('Wrote land-gibs-ndvi.json', date, 'plte entries:', parsed.plte.length / 3, 'trns len:', parsed.trns.length)
}

async function recordRecentWeather() {
  const res = await fetch(recentWeatherUrl(SHADMOT_MEHOLA, ''))
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  fs.writeFileSync(path.join(OUT_DIR, 'land-weather-shadmot.json'), JSON.stringify(await res.json(), null, 2))
  console.log('Wrote land-weather-shadmot.json')
}

fs.mkdirSync(OUT_DIR, { recursive: true })
await Promise.all([recordSentinel2(), recordGibs(), recordRecentWeather()])

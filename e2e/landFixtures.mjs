// Offline recorded living-land fixtures for the browser App perf runner (`e2e/land.perf.mjs`).
// Builds production-sized 40 m Sentinel-2 GeoTIFFs (±5 km -> 100×100 NearLandGrid) from
// `src/test/fixtures/land-s2-shadmot.json` and a 256×256 genuine-palette GIBS MODIS NDVI PNG
// from `src/test/fixtures/land-gibs-ndvi.json`. Zero network calls.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { writeArrayBuffer } from 'geotiff'

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

/** Extracts raw chunk payloads (e.g. PLTE, tRNS) from a genuine GIBS PNG. */
function extractChunk(png, wanted) {
  let off = 8
  while (off + 8 <= png.length) {
    const len = png.readUInt32BE(off)
    const type = png.toString('ascii', off + 4, off + 8)
    if (type === wanted) return png.subarray(off + 8, off + 8 + len)
    off += 12 + len
  }
  return null
}

/** Tiles a recorded 16×16 GIBS NDVI crop into a 256×256 indexed PNG preserving exact PLTE & tRNS. */
export function buildGibsNdviPng(root) {
  const fx = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/land-gibs-ndvi.json'), 'utf8'))
  const srcPng = Buffer.from(fx.cropPngBase64, 'base64')
  const plte = extractChunk(srcPng, 'PLTE'), trns = extractChunk(srcPng, 'tRNS')
  const W = 256, H = 256, crop = fx.cropIndices, n = 16
  const raw = Buffer.alloc(H * (1 + W))
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W)] = 0 // filter 0
    for (let x = 0; x < W; x++) raw[y * (1 + W) + 1 + x] = crop[(y % n) * n + (x % n)]
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 3 // 8-bit indexed palette
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig, pngChunk('IHDR', ihdr), pngChunk('PLTE', plte),
    ...(trns ? [pngChunk('tRNS', trns)] : []),
    pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** Reads the genuine recorded 256×256 NASA GIBS MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day JPEG tile. */
export function loadGibsSrJpeg(root) {
  return fs.readFileSync(path.join(root, 'src/test/fixtures/land-gibs-sr-2026-11-01.jpg'))
}

/** Builds production-sized 256×256 40 m UTM 36N GeoTIFFs (±5 km around Shadmot) from the recorded S2 fixture. */
export async function buildRecordedS2Fixture(root) {
  const fx = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/land-s2-shadmot.json'), 'utf8'))
  const W = 256, H = 256, RES = 40
  const west = 733_220, north = 3_586_780 // covers ±5 km around Shadmot (738340 E, 3581660 N)
  const tile1 = (src, ctor) => {
    const out = new ctor(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = src[(y % fx.height) * fx.width + (x % fx.width)]
    return out
  }
  const vis = new Uint8Array(W * H * 3)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const si = ((y % fx.height) * fx.width + (x % fx.width)) * 3, di = (y * W + x) * 3
      vis[di] = fx.bands.visual.data[si]; vis[di + 1] = fx.bands.visual.data[si + 1]; vis[di + 2] = fx.bands.visual.data[si + 2]
    }
  }
  const geo = {
    width: W, height: H, ModelPixelScale: [RES, RES, 0], ModelTiepoint: [0, 0, 0, west, north, 0],
    ProjectedCSTypeGeoKey: 32636, GeographicTypeGeoKey: 4326,
  }
  const make = (arr, extra) => Buffer.from(writeArrayBuffer(arr, { ...geo, ...extra }))
  const cogs = {
    'visual.tif': make(vis, { SamplesPerPixel: 3, BitsPerSample: [8, 8, 8], PhotometricInterpretation: 2 }),
    'red.tif': make(tile1(fx.bands.red.data, Uint16Array), { SamplesPerPixel: 1, BitsPerSample: [16] }),
    'nir.tif': make(tile1(fx.bands.nir.data, Uint16Array), { SamplesPerPixel: 1, BitsPerSample: [16] }),
    'scl.tif': make(tile1(fx.bands.scl.data, Uint8Array), { SamplesPerPixel: 1, BitsPerSample: [8] }),
  }
  const stac = JSON.stringify({
    features: [{
      properties: fx.properties,
      assets: {
        visual: { href: 'https://recorded.s2.test/visual.tif' },
        red: { href: 'https://recorded.s2.test/red.tif', 'raster:bands': fx.bands.red.rasterBands },
        nir: { href: 'https://recorded.s2.test/nir.tif', 'raster:bands': fx.bands.nir.rasterBands },
        scl: { href: 'https://recorded.s2.test/scl.tif' },
      },
    }],
  })
  return { stac, cogs }
}

/** Fulfills an HTTP 206 Range or 200 GET request from an in-memory Buffer (for intercepted COGs). */
export function fulfillRange(route, buf, contentType) {
  const range = route.request().headers().range
  if (range) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(range)
    if (m) {
      const start = Number(m[1]), end = m[2] ? Math.min(buf.length - 1, Number(m[2])) : buf.length - 1
      return route.fulfill({
        status: 206, contentType, body: buf.subarray(start, end + 1),
        headers: { 'Content-Range': `bytes ${start}-${end}/${buf.length}`, 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' },
      })
    }
  }
  return route.fulfill({
    status: 200, contentType, body: buf,
    headers: { 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' },
  })
}

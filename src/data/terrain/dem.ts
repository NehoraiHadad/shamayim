/**
 * A digital elevation model read from the public AWS Terrain Tiles (Mapzen "terrarium" PNGs, no key, open CORS):
 * https://registry.opendata.aws/terrain-tiles/. Each 256 px tile stores the height of every pixel in its colour,
 * height = R * 256 + G + B / 256 - 32768 metres. The horizon panorama samples it along many rays from the place.
 *
 * Tiles are read without a canvas (a canvas read can be noised by anti-fingerprinting in some browsers, which would
 * turn into false hills): the PNG is inflated with the browser's own DecompressionStream and unfiltered here.
 */

export const DEM_TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const TILE = 256

/** Fractional Web Mercator tile coordinates of a point at a zoom level. */
export function tileXY(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom
  const phi = (lat * Math.PI) / 180
  return { x: ((lon + 180) / 360) * n, y: ((1 - Math.asinh(Math.tan(phi)) / Math.PI) / 2) * n }
}

/** Heights (m) of one tile, row by row, 256 × 256. */
export type TileHeights = Float32Array

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** Decodes a terrarium tile (8-bit RGB or RGBA, not interlaced) to heights in metres. */
export async function decodeTerrarium(png: Uint8Array): Promise<TileHeights> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let width = 0
  let height = 0
  let channels = 0
  const parts: Uint8Array[] = []
  for (let at = 8; at + 8 <= png.length;) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    const body = png.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') {
      width = view.getUint32(at + 8)
      height = view.getUint32(at + 12)
      const depth = body[8]
      const colour = body[9]
      if (depth !== 8 || (colour !== 2 && colour !== 6) || body[12] !== 0) throw new Error('Unsupported elevation tile')
      channels = colour === 2 ? 3 : 4
    } else if (type === 'IDAT') parts.push(body)
    else if (type === 'IEND') break
    at += 12 + length
  }
  if (!width || !channels) throw new Error('Invalid elevation tile')
  const joined = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  parts.reduce((offset, part) => { joined.set(part, offset); return offset + part.length }, 0)
  const raw = await inflate(joined)
  const stride = width * channels
  if (raw.length < height * (stride + 1)) throw new Error('Truncated elevation tile')
  const out = new Float32Array(width * height)
  let previous = new Uint8Array(stride)
  for (let row = 0; row < height; row++) {
    const filter = raw[row * (stride + 1)]
    const line = raw.slice(row * (stride + 1) + 1, (row + 1) * (stride + 1))
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? line[i - channels] : 0
      const up = previous[i]
      const corner = i >= channels ? previous[i - channels] : 0
      if (filter === 1) line[i] = (line[i] + left) & 255
      else if (filter === 2) line[i] = (line[i] + up) & 255
      else if (filter === 3) line[i] = (line[i] + ((left + up) >> 1)) & 255
      else if (filter === 4) line[i] = (line[i] + paeth(left, up, corner)) & 255
    }
    for (let x = 0; x < width; x++) {
      const p = x * channels
      out[row * width + x] = line[p] * 256 + line[p + 1] + line[p + 2] / 256 - 32768
    }
    previous = line
  }
  return out
}

/** Heights at any point inside the tiles it was built from (bilinear between pixel centres). */
export interface Dem {
  zoom: number
  height(lat: number, lon: number): number
}

/** A DEM over loaded tiles, keyed "x/y". Points outside every tile read as NaN. */
export function demFromTiles(zoom: number, tiles: ReadonlyMap<string, TileHeights>): Dem {
  const pixel = (px: number, py: number) => {
    const tx = Math.floor(px / TILE)
    const ty = Math.floor(py / TILE)
    const tile = tiles.get(`${tx}/${ty}`)
    if (!tile) return Number.NaN
    return tile[(py - ty * TILE) * TILE + (px - tx * TILE)]
  }
  return {
    zoom,
    height(lat, lon) {
      const { x, y } = tileXY(lat, lon, zoom)
      // Pixel centres sit at half-pixel offsets.
      const fx = x * TILE - 0.5
      const fy = y * TILE - 0.5
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = fx - x0
      const ty = fy - y0
      const top = pixel(x0, y0) * (1 - tx) + pixel(x0 + 1, y0) * tx
      const bottom = pixel(x0, y0 + 1) * (1 - tx) + pixel(x0 + 1, y0 + 1) * tx
      return top * (1 - ty) + bottom * ty
    },
  }
}

/** The tiles ("x/y") at `zoom` that cover a square of `radiusKm` around a point. */
export function tilesAround(lat: number, lon: number, radiusKm: number, zoom: number): string[] {
  const dLat = radiusKm / 110.574
  const dLon = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  const a = tileXY(lat + dLat, lon - dLon, zoom)
  const b = tileXY(lat - dLat, lon + dLon, zoom)
  const keys: string[] = []
  for (let ty = Math.floor(a.y); ty <= Math.floor(b.y); ty++) {
    for (let tx = Math.floor(a.x); tx <= Math.floor(b.x); tx++) keys.push(`${tx}/${ty}`)
  }
  return keys
}

/** Loads the tiles around a point and returns the DEM over them. */
export async function fetchDem(lat: number, lon: number, radiusKm: number, zoom: number, signal?: AbortSignal): Promise<Dem> {
  const keys = tilesAround(lat, lon, radiusKm, zoom)
  const tiles = new Map<string, TileHeights>()
  await Promise.all(keys.map(async (key) => {
    const response = await fetch(`${DEM_TILE_URL}/${zoom}/${key}.png`, { signal })
    if (!response.ok) throw new Error(`Elevation tile HTTP ${response.status}`)
    tiles.set(key, await decodeTerrarium(new Uint8Array(await response.arrayBuffer())))
  }))
  return demFromTiles(zoom, tiles)
}

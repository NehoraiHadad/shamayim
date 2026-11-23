import { buildModisNdviLut, modisNdviRefToValue, UNKNOWN_COLOR } from './gibsPalette'

/**
 * Pure decoders for NASA GIBS WMTS tiles (zero canvas dependency for NDVI PNGs).
 * Validates tile palette colors against the published `MODIS_NDVI.xml` colormap via `gibsPalette.ts`
 * and returns explicit dimensions so callers can reject unexpected tile sizes.
 */
export { modisNdviRefToValue }

export interface IndexedPng {
  width: number
  height: number
  indices: Uint8Array
  plte: Uint8Array
  trns: Uint8Array
}

export interface DecodedNdviTile {
  width: number
  height: number
  data: Float32Array
}

export interface DecodedRgbTile {
  width: number
  height: number
  data: Uint8Array
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** Parses an 8-bit indexed PNG (colorType=3), returning palette indices, `PLTE` and `tRNS` chunks. */
export async function parseIndexedPng(png: Uint8Array): Promise<IndexedPng> {
  if (png.length < 24 || png[0] !== 137 || png[1] !== 80 || png[2] !== 78 || png[3] !== 71) {
    throw new Error('Invalid PNG signature')
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let width = 0, height = 0
  let plte = new Uint8Array(0)
  let trns = new Uint8Array(0)
  const parts: Uint8Array[] = []
  for (let at = 8; at + 8 <= png.length;) {
    const length = view.getUint32(at)
    if (at + 12 + length > png.length) throw new Error('Truncated PNG chunk')
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    const body = png.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') {
      width = view.getUint32(at + 8); height = view.getUint32(at + 12)
      if (body[8] !== 8 || body[9] !== 3 || body[12] !== 0) throw new Error('Unsupported GIBS NDVI PNG')
    } else if (type === 'PLTE') plte = body.slice()
    else if (type === 'tRNS') trns = body.slice()
    else if (type === 'IDAT') parts.push(body)
    else if (type === 'IEND') break
    at += 12 + length
  }
  if (!width || !height || plte.length < 3 || plte.length % 3 !== 0) {
    throw new Error('Invalid indexed PNG (missing IHDR or PLTE)')
  }
  const joined = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  parts.reduce((off, p) => { joined.set(p, off); return off + p.length }, 0)
  const raw = await inflate(joined)
  if (raw.length < height * (width + 1)) throw new Error('Truncated GIBS NDVI PNG')

  const indices = new Uint8Array(width * height)
  let prev = new Uint8Array(width)
  for (let row = 0; row < height; row++) {
    const filter = raw[row * (width + 1)]
    const line = raw.slice(row * (width + 1) + 1, (row + 1) * (width + 1))
    for (let i = 0; i < width; i++) {
      const left = i > 0 ? line[i - 1] : 0, up = prev[i], corner = i > 0 ? prev[i - 1] : 0
      if (filter === 1) line[i] = (line[i] + left) & 255
      else if (filter === 2) line[i] = (line[i] + up) & 255
      else if (filter === 3) line[i] = (line[i] + ((left + up) >> 1)) & 255
      else if (filter === 4) line[i] = (line[i] + paeth(left, up, corner)) & 255
    }
    indices.set(line, row * width)
    prev = line
  }
  return { width, height, indices, plte, trns }
}

/** Decodes an indexed-palette GIBS NDVI PNG by matching `PLTE` colors against `MODIS_NDVI.xml`. */
export async function decodeGibsNdviTile(png: Uint8Array): Promise<DecodedNdviTile> {
  const { width, height, indices, plte, trns } = await parseIndexedPng(png)
  const lut = buildModisNdviLut(plte, trns)
  const data = new Float32Array(indices.length)
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i]
    if (idx >= lut.length) throw new Error(`GIBS NDVI palette index ${idx} out of range`)
    const v = lut[idx]
    if (v === UNKNOWN_COLOR) throw new Error(`Unexpected GIBS NDVI palette color at index ${idx}`)
    data[i] = v
  }
  return { width, height, data }
}

/** Convenience decoder returning the flat NDVI float array (`width × height`). */
export async function decodeGibsNdviPng(png: Uint8Array): Promise<Float32Array> {
  return (await decodeGibsNdviTile(png)).data
}

/**
 * Browser-only JPEG tile decoder via `createImageBitmap` + `OffscreenCanvas`; returns null if
 * unavailable or if bitmap dimensions do not match `expected` (checked before allocating canvas).
 */
export async function defaultDecodeJpeg(
  bytes: Uint8Array, expected?: { width: number; height: number },
): Promise<DecodedRgbTile | null> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return null
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/jpeg' }))
  try {
    const { width, height } = bitmap
    if (!width || !height) return null
    if (expected && (width !== expected.width || height !== expected.height)) return null
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0)
    const rgba = ctx.getImageData(0, 0, width, height).data
    const rgb = new Uint8Array(width * height * 3)
    for (let i = 0, o = 0; i < rgba.length; i += 4, o += 3) {
      rgb[o] = rgba[i]; rgb[o + 1] = rgba[i + 1]; rgb[o + 2] = rgba[i + 2]
    }
    return { width, height, data: rgb }
  } finally { bitmap.close() }
}

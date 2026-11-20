/**
 * Pure decoders for NASA GIBS WMTS tiles (zero canvas dependency for NDVI PNGs).
 *
 * Provenance:
 * - `MODIS_NDVI.xml` (`https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDVI.xml`, verified
 *   143/143 exact PLTE index matches against live `MODIS_Terra_NDVI_8Day` PNG tiles on 2026-11-20):
 *   ref 0 = nodata [-0.3, -0.2); ref 1 = [-0.2, -0.1); ref 2 = [-0.1, 0.0);
 *   refs 3..62 = [0.0001, 0.3001) step 0.005; refs 63..102 = [0.3001, 0.6001) step 0.0075;
 *   refs 103..142 = [0.6001, 1.0001) step 0.01.
 */

/** Maps a `MODIS_Terra_NDVI_8Day` PNG palette index (0..142) to bin midpoint NDVI, or NaN for nodata. */
export function modisNdviRefToValue(ref: number): number {
  if (ref === 1) return -0.15
  if (ref === 2) return -0.05
  if (ref >= 3 && ref <= 62) return 0.0001 + (ref - 3 + 0.5) * 0.005
  if (ref >= 63 && ref <= 102) return 0.3001 + (ref - 63 + 0.5) * 0.0075
  if (ref >= 103 && ref <= 142) return 0.6001 + (ref - 103 + 0.5) * 0.01
  return Number.NaN
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

/** Decodes an 8-bit indexed-palette (colorType=3) GIBS NDVI PNG tile into `width × height` NDVI floats. */
export async function decodeGibsNdviPng(png: Uint8Array): Promise<Float32Array> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  let width = 0, height = 0
  const parts: Uint8Array[] = []
  for (let at = 8; at + 8 <= png.length;) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    const body = png.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') {
      width = view.getUint32(at + 8); height = view.getUint32(at + 12)
      if (body[8] !== 8 || body[9] !== 3 || body[12] !== 0) throw new Error('Unsupported GIBS NDVI PNG')
    } else if (type === 'IDAT') parts.push(body)
    else if (type === 'IEND') break
    at += 12 + length
  }
  if (!width || !height) throw new Error('Invalid GIBS NDVI PNG')
  const joined = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  parts.reduce((off, p) => { joined.set(p, off); return off + p.length }, 0)
  const raw = await inflate(joined)
  if (raw.length < height * (width + 1)) throw new Error('Truncated GIBS NDVI PNG')
  const out = new Float32Array(width * height)
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
      out[row * width + i] = modisNdviRefToValue(line[i])
    }
    prev = line
  }
  return out
}

/** Browser-only JPEG tile decoder via `createImageBitmap` + `OffscreenCanvas`; returns null if unavailable. */
export async function defaultDecodeJpeg(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return null
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/jpeg' }))
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0)
    const rgba = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data
    const rgb = new Uint8Array(bitmap.width * bitmap.height * 3)
    for (let i = 0, o = 0; i < rgba.length; i += 4, o += 3) {
      rgb[o] = rgba[i]; rgb[o + 1] = rgba[i + 1]; rgb[o + 2] = rgba[i + 2]
    }
    return rgb
  } finally { bitmap.close() }
}

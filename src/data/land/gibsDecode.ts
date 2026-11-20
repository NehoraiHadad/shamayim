/**
 * Pure decoders for NASA GIBS WMTS tiles (zero canvas dependency for NDVI PNGs).
 *
 * Provenance:
 * - `MODIS_NDVI.xml` (`https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDVI.xml`, verified
 *   143/143 exact PLTE index matches against live `MODIS_Terra_NDVI_8Day` PNG tiles on 2026-11-20):
 *   ref 0 = nodata [-0.3, -0.2) (also `tRNS[0] = 0`); ref 1 = [-0.2, -0.1); ref 2 = [-0.1, 0.0);
 *   refs 3..62 = [0.0001, 0.3001) step 0.005; refs 63..102 = [0.3001, 0.6001) step 0.0075;
 *   refs 103..142 = [0.6001, 1.0001) step 0.01.
 */

export interface IndexedPng {
  width: number
  height: number
  indices: Uint8Array
  plte: Uint8Array
  trns: Uint8Array
}

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

/** Decodes an 8-bit indexed-palette GIBS NDVI PNG tile into `width × height` NDVI floats (nodata -> NaN). */
export async function decodeGibsNdviPng(png: Uint8Array): Promise<Float32Array> {
  const { indices, plte, trns } = await parseIndexedPng(png)
  const paletteLen = plte.length / 3
  const out = new Float32Array(indices.length)
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i]
    // In genuine GIBS MODIS_NDVI PNGs, ref 0 is nodata (alpha=0), refs 1..2 are negative NDVI
    // (rendered transparent on map overlays), and refs 3..142 are opaque; any transparent ref >= 3
    // or out-of-palette index is treated as nodata.
    const hidden = idx === 0 || idx >= paletteLen || (idx >= 3 && idx < trns.length && trns[idx] === 0)
    out[i] = hidden ? Number.NaN : modisNdviRefToValue(idx)
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

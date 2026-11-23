import zlib from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import gibsFixture from '../../test/fixtures/land-gibs-ndvi.json'
import { farAt, fetchFarLand, srCompositeDates } from './gibs'
import { decodeGibsNdviPng, defaultDecodeJpeg, modisNdviRefToValue, parseIndexedPng } from './gibsDecode'
import { MODIS_NDVI_RGB } from './gibsPalette'

afterEach(() => { vi.unstubAllGlobals() })

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)) }
  return (c ^ 0xffffffff) >>> 0
}

function makeIndexedPng(w: number, h: number, rows: Uint8Array[], filters: number[], plte?: Uint8Array, trns?: Uint8Array): Uint8Array {
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer)
    dv.setUint32(0, data.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(data, 8)
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
    return out
  }
  const ihdr = new Uint8Array(13)
  new DataView(ihdr.buffer).setUint32(0, w)
  new DataView(ihdr.buffer).setUint32(4, h)
  ihdr[8] = 8; ihdr[9] = 3
  const raw = new Uint8Array(h * (w + 1))
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = filters[y]; raw.set(rows[y], y * (w + 1) + 1) }
  const palette = plte ?? (() => { const p = new Uint8Array(256 * 3); p.set(MODIS_NDVI_RGB, 0); return p })()
  const parts = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', palette),
    ...(trns ? [chunk('tRNS', trns)] : []), chunk('IDAT', new Uint8Array(zlib.deflateSync(raw))), chunk('IEND', new Uint8Array(0)),
  ]
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  parts.reduce((o, p) => { out.set(p, o); return o + p.length }, 0)
  return out
}

describe('NASA GIBS far land source', () => {
  it('decodes genuine GIBS crop, validates PLTE colors across reordered & alien palettes, and handles PNG filters', async () => {
    expect(Number.isNaN(modisNdviRefToValue(0))).toBe(true)
    expect(modisNdviRefToValue(3)).toBeCloseTo(0.0026, 4)
    expect(modisNdviRefToValue(142)).toBeCloseTo(0.9951, 4)

    const cropBytes = Uint8Array.from(Buffer.from(gibsFixture.cropPngBase64, 'base64'))
    const parsed = await parseIndexedPng(cropBytes)
    expect([parsed.width, parsed.height, parsed.plte.length, parsed.trns.length]).toEqual([16, 16, 256 * 3, 256])
    expect([parsed.plte[0], parsed.plte[1], parsed.plte[2], parsed.trns[0]]).toEqual([0, 26, 105, 0])
    expect([parsed.plte[88 * 3], parsed.plte[88 * 3 + 1], parsed.plte[88 * 3 + 2], parsed.trns[88]]).toEqual([93, 163, 1, 255])

    const decoded = await decodeGibsNdviPng(cropBytes)
    expect(decoded[0]).toBeCloseTo(0.2376, 4)  // ref 50: 0.0001 + 47.5 * 0.005
    expect(decoded[1]).toBeCloseTo(0.35635, 4) // ref 70: 0.3001 + 7.5 * 0.0075
    expect(decoded[5]).toBeCloseTo(0.49135, 4) // ref 88: 0.3001 + 25.5 * 0.0075
    expect(decoded[9]).toBeCloseTo(0.57385, 4) // ref 99: 0.3001 + 36.5 * 0.0075

    // Genuine blank GIBS tile decodes to all NaN
    const blankDecoded = await decodeGibsNdviPng(Uint8Array.from(Buffer.from(gibsFixture.blankPngBase64, 'base64')))
    expect(Array.from(blankDecoded).every((v) => Number.isNaN(v))).toBe(true)

    // Reordered palette: move published ref 88 RGB [93,163,1] to index 5 and ref 50 RGB [172,141,116] to index 6 ->
    // color-matching STILL yields exact scientific NDVI values rather than index-based corruption!
    const reorderedPlte = new Uint8Array(256 * 3)
    reorderedPlte.set([0, 26, 105], 0)
    reorderedPlte.set([93, 163, 1], 5 * 3)
    reorderedPlte.set([172, 141, 116], 6 * 3)
    const reorderedPng = makeIndexedPng(2, 1, [Uint8Array.from([5, 6])], [0], reorderedPlte, Uint8Array.from([0, 255, 255, 255, 255, 255, 255]))
    const reordered = await decodeGibsNdviPng(reorderedPng)
    expect(reordered[0]).toBeCloseTo(0.49135, 4)
    expect(reordered[1]).toBeCloseTo(0.2376, 4)

    // Alien palette color not in MODIS_NDVI.xml throws instead of emitting bogus NDVI
    const alienPlte = new Uint8Array(256 * 3).fill(123)
    const alienPng = makeIndexedPng(2, 2, [Uint8Array.from([10, 10]), Uint8Array.from([10, 10])], [0, 0], alienPlte)
    await expect(decodeGibsNdviPng(alienPng)).rejects.toThrow(/palette color/i)

    // Sub (1) and Up (2) PNG filters on a 2×2 tile -> refs [20, 40; 30, 50]
    const filtered = makeIndexedPng(2, 2, [Uint8Array.from([20, 20]), Uint8Array.from([10, 10])], [1, 2])
    const f = await decodeGibsNdviPng(filtered)
    expect(f[0]).toBeCloseTo(0.0876, 4); expect(f[1]).toBeCloseTo(0.1876, 4)
    expect(f[2]).toBeCloseTo(0.1376, 4); expect(f[3]).toBeCloseTo(0.2376, 4)
  })

  it('rejects blank 200s and unexpected tile dimensions, retains partial tiles, and supports RGB-only success', async () => {
    expect(srCompositeDates(new Date('2026-11-20T12:00:00Z'), 3)).toEqual(['2026-11-09', '2026-11-01', '2026-10-24'])
    const blank256 = makeIndexedPng(256, 256, Array.from({ length: 256 }, () => new Uint8Array(256)), new Array<number>(256).fill(0), undefined, Uint8Array.from([0]))
    const valid256 = makeIndexedPng(256, 256, Array.from({ length: 256 }, () => new Uint8Array(256).fill(89)), new Array<number>(256).fill(0))
    const wrongSize128 = makeIndexedPng(128, 128, Array.from({ length: 128 }, () => new Uint8Array(128).fill(89)), new Array<number>(128).fill(0))
    const mockRgb = { width: 256, height: 256, data: new Uint8Array(256 * 256 * 3) }
    for (let i = 0; i < mockRgb.data.length; i += 3) { mockRgb.data[i] = 140; mockRgb.data[i + 1] = 152; mockRgb.data[i + 2] = 102 }

    const place = { lat: 32.3465, lon: 35.5325 }
    const far = await fetchFarLand(place, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async (input) => {
        const url = String(input)
        if (url.includes('/2026-11-18/')) return new Response(blank256 as BodyInit, { status: 200 })
        if (url.includes('/2026-11-16/')) return new Response(wrongSize128 as BodyInit, { status: 200 })
        if (url.includes('/2026-11-09/')) return new Response(null, { status: 404 })
        if (url.endsWith('.png')) return url.includes('/8/102/') ? new Response(null, { status: 404 }) : new Response(valid256 as BodyInit, { status: 200 })
        return new Response(new Uint8Array([1, 2, 3]) as BodyInit, { status: 200 })
      }) as typeof fetch,
      decodeJpeg: async () => mockRgb,
    })
    expect(far?.source).toBe('gibs:2026-11-13'); expect(far?.rgbSource).toBe('gibs:2026-11-01')
    const hit = farAt(far!, place.lat, place.lon)!
    expect(hit.ndvi).toBeCloseTo(0.49885, 4); expect(hit.ndviDate).toBe('2026-11-13')
    expect(hit.rgb).toEqual([140, 152, 102]); expect(hit.rgbDate).toBe('2026-11-01')

    // Wrong-shape same-pixel-count JPEG (128×512 = 65536 px = 256×256) rejected both in defaultDecodeJpeg (before canvas!) and fetchFarLand
    const close = vi.fn(), canvasCtor = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 128, height: 512, close })))
    vi.stubGlobal('OffscreenCanvas', canvasCtor)
    expect(await defaultDecodeJpeg(new Uint8Array([1, 2, 3]), { width: 256, height: 256 })).toBeNull()
    expect(close).toHaveBeenCalledTimes(1)
    expect(canvasCtor).not.toHaveBeenCalled()

    const badRgb = await fetchFarLand(place, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async (input) => {
        if (String(input).endsWith('.png')) throw new Error('NDVI down')
        return new Response(new Uint8Array([1, 2, 3]) as BodyInit, { status: 200 })
      }) as typeof fetch,
      decodeJpeg: async () => ({ width: 128, height: 512, data: new Uint8Array(128 * 512 * 3).fill(120) }),
    })
    expect(badRgb).toBeNull()

    const rgbOnly = await fetchFarLand(place, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async (input) => {
        if (String(input).endsWith('.png')) throw new Error('NDVI down')
        return new Response(new Uint8Array([1, 2, 3]) as BodyInit, { status: 200 })
      }) as typeof fetch,
      decodeJpeg: async () => mockRgb,
    })
    expect(rgbOnly?.date).toBeNull(); expect(rgbOnly?.rgbSource).toBe('gibs:2026-11-09')
    expect(farAt(rgbOnly!, place.lat, place.lon)?.rgb).toEqual([140, 152, 102])
  })
})

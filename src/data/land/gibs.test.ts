import zlib from 'node:zlib'
import { describe, expect, it } from 'vitest'
import gibsFixture from '../../test/fixtures/land-gibs-ndvi.json'
import { farAt, fetchFarLand, srCompositeDates } from './gibs'
import { decodeGibsNdviPng, modisNdviRefToValue, parseIndexedPng } from './gibsDecode'

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}

function makeIndexedPng(w: number, h: number, rows: Uint8Array[], filters: number[], plte?: Uint8Array, trns?: Uint8Array): Uint8Array {
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length)
    const dv = new DataView(out.buffer)
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
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = filters[y]
    raw.set(rows[y], y * (w + 1) + 1)
  }
  const palette = plte ?? new Uint8Array(256 * 3).fill(128)
  const parts = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('PLTE', palette),
    ...(trns ? [chunk('tRNS', trns)] : []),
    chunk('IDAT', new Uint8Array(zlib.deflateSync(raw))),
    chunk('IEND', new Uint8Array(0)),
  ]
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  parts.reduce((o, p) => { out.set(p, o); return o + p.length }, 0)
  return out
}

describe('NASA GIBS far land source', () => {
  it('maps MODIS_NDVI.xml palette refs across all three piecewise segments', () => {
    expect(Number.isNaN(modisNdviRefToValue(0))).toBe(true)
    expect(modisNdviRefToValue(1)).toBe(-0.15)
    expect(modisNdviRefToValue(2)).toBe(-0.05)
    expect(modisNdviRefToValue(3)).toBeCloseTo(0.0026, 4)
    expect(modisNdviRefToValue(62)).toBeCloseTo(0.2976, 4)
    expect(modisNdviRefToValue(63)).toBeCloseTo(0.30385, 4)
    expect(modisNdviRefToValue(102)).toBeCloseTo(0.59635, 4)
    expect(modisNdviRefToValue(103)).toBeCloseTo(0.6051, 4)
    expect(modisNdviRefToValue(142)).toBeCloseTo(0.9951, 4)
    expect(Number.isNaN(modisNdviRefToValue(200))).toBe(true)
  })

  it('decodes the genuine lossless GIBS crop preserving PLTE/tRNS and matches independently derived NDVI values', async () => {
    const cropBytes = Uint8Array.from(Buffer.from(gibsFixture.cropPngBase64, 'base64'))
    const parsed = await parseIndexedPng(cropBytes)
    expect(parsed.width).toBe(16)
    expect(parsed.height).toBe(16)
    expect(parsed.plte.length).toBe(256 * 3)
    expect(parsed.trns.length).toBe(256)
    // Verify genuine NASA MODIS_NDVI.xml PLTE colors & tRNS transparency independently
    expect([parsed.plte[0], parsed.plte[1], parsed.plte[2], parsed.trns[0]]).toEqual([0, 26, 105, 0])
    expect([parsed.plte[50 * 3], parsed.plte[50 * 3 + 1], parsed.plte[50 * 3 + 2], parsed.trns[50]]).toEqual([172, 141, 116, 255])
    expect([parsed.plte[88 * 3], parsed.plte[88 * 3 + 1], parsed.plte[88 * 3 + 2], parsed.trns[88]]).toEqual([93, 163, 1, 255])
    expect([parsed.plte[99 * 3], parsed.plte[99 * 3 + 1], parsed.plte[99 * 3 + 2], parsed.trns[99]]).toEqual([67, 141, 0, 255])
    expect([parsed.plte[142 * 3], parsed.plte[142 * 3 + 1], parsed.plte[142 * 3 + 2], parsed.trns[142]]).toEqual([0, 24, 1, 255])

    // Independent numeric NDVI assertions for pixel indices [0]=50, [1]=70, [5]=88, [9]=99 (not calling production mapper)
    const decoded = await decodeGibsNdviPng(cropBytes)
    expect(decoded[0]).toBeCloseTo(0.2376, 4)  // ref 50: 0.0001 + 47.5 * 0.005
    expect(decoded[1]).toBeCloseTo(0.35635, 4) // ref 70: 0.3001 + 7.5 * 0.0075
    expect(decoded[5]).toBeCloseTo(0.49135, 4) // ref 88: 0.3001 + 25.5 * 0.0075
    expect(decoded[9]).toBeCloseTo(0.57385, 4) // ref 99: 0.3001 + 36.5 * 0.0075

    // Genuine blank GIBS tile (all index 0, transparent via tRNS) decodes to all NaN
    const blankBytes = Uint8Array.from(Buffer.from(gibsFixture.blankPngBase64, 'base64'))
    const blankDecoded = await decodeGibsNdviPng(blankBytes)
    expect(Array.from(blankDecoded).every((v) => Number.isNaN(v))).toBe(true)

    // Sub (1) and Up (2) PNG filters on a 2×2 tile -> refs [20, 40; 30, 50]
    const filtered = makeIndexedPng(2, 2, [Uint8Array.from([20, 20]), Uint8Array.from([10, 10])], [1, 2])
    const f = await decodeGibsNdviPng(filtered)
    expect(f[0]).toBeCloseTo(0.0876, 4) // ref 20
    expect(f[1]).toBeCloseTo(0.1876, 4) // ref 40
    expect(f[2]).toBeCloseTo(0.1376, 4) // ref 30
    expect(f[3]).toBeCloseTo(0.2376, 4) // ref 50
  })

  it('rejects blank HTTP 200 dates, retains valid partial tiles with holes, and supports RGB-only success', async () => {
    expect(srCompositeDates(new Date('2026-11-20T12:00:00Z'), 3)).toEqual(['2026-11-09', '2026-11-01', '2026-10-24'])

    const blank256 = makeIndexedPng(
      256, 256, Array.from({ length: 256 }, () => new Uint8Array(256)), new Array<number>(256).fill(0),
      undefined, Uint8Array.from([0]),
    )
    const valid256 = makeIndexedPng(
      256, 256, Array.from({ length: 256 }, () => new Uint8Array(256).fill(89)), new Array<number>(256).fill(0),
    )
    const mockRgb = new Uint8Array(256 * 256 * 3)
    for (let i = 0; i < mockRgb.length; i += 3) { mockRgb[i] = 140; mockRgb[i + 1] = 152; mockRgb[i + 2] = 102 }

    // Case 1: Newest NDVI date returns blank HTTP 200 -> falls back to 2026-11-16 where 1 tile 404s (partial retained)
    const place = { lat: 32.3465, lon: 35.5325 }
    const far = await fetchFarLand(place, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async (input) => {
        const url = String(input)
        if (url.includes('/2026-11-18/')) return new Response(blank256 as BodyInit, { status: 200 })
        if (url.includes('/2026-11-09/')) return new Response(null, { status: 404 })
        if (url.endsWith('.png')) {
          // Simulate one missing tile (row 102) on 2026-11-16 -> keep remaining valid tiles with holes
          if (url.includes('/8/102/')) return new Response(null, { status: 404 })
          return new Response(valid256 as BodyInit, { status: 200 })
        }
        return new Response(new Uint8Array([1, 2, 3]) as BodyInit, { status: 200 })
      }) as typeof fetch,
      decodeJpeg: async () => mockRgb,
    })

    expect(far).not.toBeNull()
    expect(far!.source).toBe('gibs:2026-11-16')
    expect(far!.rgbSource).toBe('gibs:2026-11-01')
    const hit = farAt(far!, place.lat, place.lon)
    expect(hit).not.toBeNull()
    expect(hit!.ndvi).toBeCloseTo(0.49885, 4) // ref 89
    expect(hit!.ndviDate).toBe('2026-11-16')
    expect(hit!.rgb).toEqual([140, 152, 102])
    expect(hit!.rgbDate).toBe('2026-11-01')

    // Case 2: NDVI fetch throws on all dates while SR RGB succeeds -> RGB-only grid is returned
    const rgbOnly = await fetchFarLand(place, undefined, new Date('2026-11-20T12:00:00Z'), {
      fetchImpl: (async (input) => {
        const url = String(input)
        if (url.endsWith('.png')) throw new Error('NDVI layer down')
        return new Response(new Uint8Array([1, 2, 3]) as BodyInit, { status: 200 })
      }) as typeof fetch,
      decodeJpeg: async () => mockRgb,
    })
    expect(rgbOnly).not.toBeNull()
    expect(rgbOnly!.date).toBeNull()
    expect(rgbOnly!.source).toBeNull()
    expect(rgbOnly!.rgbSource).toBe('gibs:2026-11-09')
    const rgbSample = farAt(rgbOnly!, place.lat, place.lon)
    expect(rgbSample?.ndvi).toBeNull()
    expect(rgbSample?.rgb).toEqual([140, 152, 102])
    expect(rgbSample?.rgbDate).toBe('2026-11-09')
  })
})

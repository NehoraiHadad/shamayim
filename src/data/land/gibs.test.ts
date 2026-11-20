import zlib from 'node:zlib'
import { describe, expect, it } from 'vitest'
import gibsFixture from '../../test/fixtures/land-gibs-ndvi.json'
import { farAt, fetchFarLand, srCompositeDates } from './gibs'
import { decodeGibsNdviPng, modisNdviRefToValue } from './gibsDecode'

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}

function makeIndexedPng(w: number, h: number, rows: Uint8Array[], filters: number[]): Uint8Array {
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
  const parts = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
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

  it('decodes the recorded GIBS indexed PNG fixture and handles Sub/Up/Avg/Paeth filters', async () => {
    const bytes = Uint8Array.from(Buffer.from(gibsFixture.samplePngBase64, 'base64'))
    const decoded = await decodeGibsNdviPng(bytes)
    expect(decoded.length).toBe(64)
    expect(Number.isNaN(decoded[0])).toBe(true) // ref 0 nodata
    expect(decoded[1]).toBeCloseTo(-0.15, 4) // ref 1
    expect(decoded[5]).toBeCloseTo(modisNdviRefToValue(89), 4)
    expect(decoded[7]).toBeCloseTo(modisNdviRefToValue(142), 4)

    // Real recorded live crop has plausible vegetation/bare NDVI over Israel in November
    const validCrop = gibsFixture.ndviCrop.filter((v): v is number => v !== null)
    expect(validCrop.length).toBeGreaterThan(200)
    expect(Math.min(...validCrop)).toBeGreaterThan(-0.2)
    expect(Math.max(...validCrop)).toBeLessThan(0.9)

    // Exercise Sub (1) and Up (2) PNG filters on a 2×2 tile: target refs [20, 40; 30, 50]
    const png = makeIndexedPng(2, 2, [Uint8Array.from([20, 20]), Uint8Array.from([10, 10])], [1, 2])
    const f = await decodeGibsNdviPng(png)
    expect(f[0]).toBeCloseTo(modisNdviRefToValue(20), 4)
    expect(f[1]).toBeCloseTo(modisNdviRefToValue(40), 4)
    expect(f[2]).toBeCloseTo(modisNdviRefToValue(30), 4)
    expect(f[3]).toBeCloseTo(modisNdviRefToValue(50), 4)
  })

  it('computes 8-day DOY-aligned SR dates and fetches far land with mocked WMTS tiles', async () => {
    const dates = srCompositeDates(new Date('2026-11-20T12:00:00Z'), 3)
    expect(dates).toEqual(['2026-11-09', '2026-11-01', '2026-10-24'])

    const tile256 = makeIndexedPng(
      256, 256,
      Array.from({ length: 256 }, () => new Uint8Array(256).fill(89)),
      new Array<number>(256).fill(0),
    )
    const mockRgb = new Uint8Array(256 * 256 * 3)
    for (let i = 0; i < mockRgb.length; i += 3) { mockRgb[i] = 140; mockRgb[i + 1] = 152; mockRgb[i + 2] = 102 }

    const mockFetch: typeof fetch = (async (input) => {
      const url = String(input)
      // Simulate newest date 404 -> falls back to second candidate date
      if (url.includes('/2026-11-18/') || url.includes('/2026-11-09/')) return new Response(null, { status: 404 })
      if (url.endsWith('.png')) return new Response(tile256 as BodyInit, { status: 200 })
      return new Response(new Uint8Array([1, 2, 3]) as BodyInit, { status: 200 })
    }) as typeof fetch

    const far = await fetchFarLand(
      { lat: 32.3465, lon: 35.5325 },
      undefined,
      new Date('2026-11-20T12:00:00Z'),
      { fetchImpl: mockFetch, decodeJpeg: async () => mockRgb },
    )
    expect(far).not.toBeNull()
    expect(far!.source).toBe('gibs:2026-11-16')
    expect(far!.rgbSource).toBe('gibs:2026-11-01')

    const sample = farAt(far!, 32.5, 35.6)
    expect(sample).not.toBeNull()
    expect(sample!.ndvi).toBeCloseTo(modisNdviRefToValue(89), 4)
    expect(sample!.rgb).toEqual([140, 152, 102])
    expect(farAt(far!, 34.0, 35.5)).toBeNull() // > 60 km outside window
  })
})
